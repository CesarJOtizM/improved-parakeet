import { Inject, Injectable, Logger } from '@nestjs/common';
import { RETURN_NOT_FOUND } from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IRemoveReturnLineRequest {
  returnId: string;
  lineId: string;
  orgId: string;
}

export type IRemoveReturnLineResponse = IApiResponseSuccess<{ message: string }>;

@Injectable()
export class RemoveReturnLineUseCase {
  private readonly logger = new Logger(RemoveReturnLineUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IRemoveReturnLineRequest
  ): Promise<Result<IRemoveReturnLineResponse, DomainError>> {
    this.logger.log('Removing line from return', {
      returnId: request.returnId,
      lineId: request.lineId,
      orgId: request.orgId,
    });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.returnId, request.orgId);

    if (!returnEntity) {
      return err(
        new NotFoundError(`Return with ID ${request.returnId} not found`, RETURN_NOT_FOUND)
      );
    }

    // Remove line from return
    try {
      returnEntity.removeLine(request.lineId);
    } catch (error) {
      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to remove line from return'
        )
      );
    }

    // Save return
    const updatedReturn = await this.returnRepository.save(returnEntity);

    // Dispatch domain events
    updatedReturn.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedReturn.domainEvents);
    updatedReturn.clearEvents();

    this.logger.log('Line removed from return successfully', {
      returnId: updatedReturn.id,
      lineId: request.lineId,
    });

    return ok({
      success: true,
      message: 'Line removed from return successfully',
      data: { message: 'Line removed successfully' },
      timestamp: new Date().toISOString(),
    });
  }
}
