import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IMarkMovementReturnedRequest {
  movementId: string;
  orgId: string;
  userId?: string;
}

export interface IMarkMovementReturnedData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
  returnedAt?: Date;
  returnedBy?: string;
}

export type IMarkMovementReturnedResponse = IApiResponseSuccess<IMarkMovementReturnedData>;

@Injectable()
export class MarkMovementReturnedUseCase {
  private readonly logger = new Logger(MarkMovementReturnedUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IMarkMovementReturnedRequest
  ): Promise<Result<IMarkMovementReturnedResponse, DomainError>> {
    this.logger.log('Marking movement as returned', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError('Movement not found', 'MOVEMENT_NOT_FOUND'));
    }

    if (!movement.status.canReturn()) {
      return err(
        new BusinessRuleError(
          'Only POSTED movements can be marked as returned',
          'MOVEMENT_CANNOT_BE_RETURNED'
        )
      );
    }

    try {
      const returnedMovement = movement.markAsReturned(request.userId);
      const savedMovement = await this.movementRepository.save(returnedMovement);

      await this.eventDispatcher.markAndDispatch(returnedMovement.domainEvents);

      this.logger.log('Movement marked as returned successfully', {
        movementId: savedMovement.id,
      });

      return ok({
        success: true,
        message: 'Movement marked as returned successfully',
        data: {
          id: savedMovement.id,
          type: savedMovement.type.getValue(),
          status: savedMovement.status.getValue(),
          warehouseId: savedMovement.warehouseId,
          returnedAt: savedMovement.returnedAt,
          returnedBy: savedMovement.returnedBy,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to mark movement as returned'
        )
      );
    }
  }
}
