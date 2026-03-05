import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MOVEMENT_CANNOT_POST,
  MOVEMENT_NOT_FOUND,
  STOCK_INSUFFICIENT,
} from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { StockValidationService } from '@stock/domain/services/stockValidation.service';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IPostMovementRequest {
  movementId: string;
  orgId: string;
  postedBy?: string;
}

export interface IPostMovementData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
  postedAt: Date;
  linesCount: number;
  totalQuantity: number;
}

export type IPostMovementResponse = IApiResponseSuccess<IPostMovementData>;

@Injectable()
export class PostMovementUseCase {
  private readonly logger = new Logger(PostMovementUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IPostMovementRequest
  ): Promise<Result<IPostMovementResponse, DomainError>> {
    this.logger.log('Posting movement', { movementId: request.movementId, orgId: request.orgId });

    // Retrieve movement
    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError('Movement not found', MOVEMENT_NOT_FOUND));
    }

    // Validate movement can be posted using aggregate method
    if (!movement.canPost()) {
      return err(new BusinessRuleError('Movement cannot be posted', MOVEMENT_CANNOT_POST));
    }

    // Validate stock availability for output movements
    if (movement.type.isOutput()) {
      const stockValidationResult = await this.validateStockAvailability(movement, request.orgId);
      if (stockValidationResult.isErr()) {
        return err(stockValidationResult.unwrapErr());
      }
    }

    // Post the movement - this returns a new instance with the event attached
    const postedMovement = movement.post(request.postedBy);

    // Save the posted movement
    const savedMovement = await this.movementRepository.save(postedMovement);

    // Dispatch domain events to update stock via MovementPostedEventHandler
    await this.eventDispatcher.markAndDispatch(postedMovement.domainEvents);

    this.logger.log('Movement posted successfully', {
      movementId: savedMovement.id,
      type: savedMovement.type.getValue(),
    });

    return ok({
      success: true,
      message: 'Movement posted successfully',
      data: {
        id: savedMovement.id,
        type: savedMovement.type.getValue(),
        status: savedMovement.status.getValue(),
        warehouseId: savedMovement.warehouseId,
        postedAt: savedMovement.postedAt!,
        linesCount: savedMovement.getLines().length,
        totalQuantity: savedMovement.getTotalQuantity(),
      } as IPostMovementData,
      timestamp: new Date().toISOString(),
    });
  }

  private async validateStockAvailability(
    movement: Movement,
    orgId: string
  ): Promise<Result<void, DomainError>> {
    const lines = movement.getLines();
    const warehouseId = movement.warehouseId;

    // Get all pending movements for this warehouse to calculate available stock
    const pendingMovements = await this.movementRepository.findDraftMovements(orgId);
    const postedMovements = await this.movementRepository.findPostedMovements(orgId);
    const allPendingMovements = [...pendingMovements, ...postedMovements].filter(
      m => m.warehouseId === warehouseId && m.id !== movement.id
    );

    // Validate stock for each output line
    for (const line of lines) {
      const currentStock = await this.stockRepository.getStockQuantity(
        line.productId,
        warehouseId,
        orgId,
        line.locationId
      );

      const validation = StockValidationService.validateStockForOutput(
        line.productId,
        line.locationId,
        line.quantity,
        currentStock,
        allPendingMovements
      );

      if (!validation.isValid) {
        return err(
          new BusinessRuleError(
            `Insufficient stock for product ${line.productId} at location ${line.locationId}: ${validation.errors.join(', ')}`,
            STOCK_INSUFFICIENT
          )
        );
      }
    }

    return ok(undefined);
  }
}
