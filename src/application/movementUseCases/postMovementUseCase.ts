import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { StockValidationService } from '@stock/domain/services/stockValidation.service';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IPostMovementRequest {
  movementId: string;
  orgId: string;
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
    private readonly stockRepository: IStockRepository
  ) {}

  async execute(request: IPostMovementRequest): Promise<IPostMovementResponse> {
    this.logger.log('Posting movement', { movementId: request.movementId, orgId: request.orgId });

    // Retrieve movement
    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    // Validate movement can be posted
    if (!movement.status.canPost()) {
      throw new BadRequestException('Movement cannot be posted in its current status');
    }

    // Validate stock availability for output movements
    if (movement.type.isOutput()) {
      await this.validateStockAvailability(movement, request.orgId);
    }

    // Post the movement (this will emit MovementPostedEvent)
    movement.post();

    // Save the movement
    const savedMovement = await this.movementRepository.save(movement);

    this.logger.log('Movement posted successfully', {
      movementId: savedMovement.id,
      type: savedMovement.type.getValue(),
    });

    return {
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
    };
  }

  private async validateStockAvailability(movement: Movement, orgId: string): Promise<void> {
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
        throw new BadRequestException(
          `Insufficient stock for product ${line.productId} at location ${line.locationId}: ${validation.errors.join(', ')}`
        );
      }
    }
  }
}
