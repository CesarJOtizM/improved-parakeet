import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

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
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: IRemoveReturnLineRequest): Promise<IRemoveReturnLineResponse> {
    this.logger.log('Removing line from return', {
      returnId: request.returnId,
      lineId: request.lineId,
      orgId: request.orgId,
    });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.returnId, request.orgId);

    if (!returnEntity) {
      throw new NotFoundException(`Return with ID ${request.returnId} not found`);
    }

    // Remove line from return
    try {
      returnEntity.removeLine(request.lineId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to remove line from return'
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

    return {
      success: true,
      message: 'Line removed from return successfully',
      data: { message: 'Line removed successfully' },
      timestamp: new Date().toISOString(),
    };
  }
}
