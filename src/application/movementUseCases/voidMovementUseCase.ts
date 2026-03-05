import { Inject, Injectable, Logger } from '@nestjs/common';
import { MOVEMENT_CANNOT_BE_VOIDED, MOVEMENT_NOT_FOUND } from '@shared/constants/error-codes';
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

export interface IVoidMovementRequest {
  movementId: string;
  orgId: string;
}

export interface IVoidMovementData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
}

export type IVoidMovementResponse = IApiResponseSuccess<IVoidMovementData>;

@Injectable()
export class VoidMovementUseCase {
  private readonly logger = new Logger(VoidMovementUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IVoidMovementRequest
  ): Promise<Result<IVoidMovementResponse, DomainError>> {
    this.logger.log('Voiding movement', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError('Movement not found', MOVEMENT_NOT_FOUND));
    }

    if (!movement.status.canVoid()) {
      return err(
        new BusinessRuleError('Only POSTED movements can be voided', MOVEMENT_CANNOT_BE_VOIDED)
      );
    }

    const voidedMovement = movement.void();
    const savedMovement = await this.movementRepository.save(voidedMovement);

    await this.eventDispatcher.markAndDispatch(voidedMovement.domainEvents);

    this.logger.log('Movement voided successfully', { movementId: savedMovement.id });

    return ok({
      success: true,
      message: 'Movement voided successfully',
      data: {
        id: savedMovement.id,
        type: savedMovement.type.getValue(),
        status: savedMovement.status.getValue(),
        warehouseId: savedMovement.warehouseId,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
