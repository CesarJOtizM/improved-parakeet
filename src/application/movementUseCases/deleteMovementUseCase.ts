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

export interface IDeleteMovementRequest {
  movementId: string;
  orgId: string;
}

export type IDeleteMovementResponse = IApiResponseSuccess<{ deleted: boolean }>;

@Injectable()
export class DeleteMovementUseCase {
  private readonly logger = new Logger(DeleteMovementUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository
  ) {}

  async execute(
    request: IDeleteMovementRequest
  ): Promise<Result<IDeleteMovementResponse, DomainError>> {
    this.logger.log('Deleting movement', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError('Movement not found', 'MOVEMENT_NOT_FOUND'));
    }

    if (!movement.status.isDraft()) {
      return err(
        new BusinessRuleError('Only DRAFT movements can be deleted', 'MOVEMENT_CANNOT_BE_DELETED')
      );
    }

    await this.movementRepository.delete(request.movementId, request.orgId);

    this.logger.log('Movement deleted successfully', { movementId: request.movementId });

    return ok({
      success: true,
      message: 'Movement deleted successfully',
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    });
  }
}
