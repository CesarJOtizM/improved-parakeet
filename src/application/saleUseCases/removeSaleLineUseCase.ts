import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IRemoveSaleLineRequest {
  saleId: string;
  lineId: string;
  orgId: string;
}

export type IRemoveSaleLineResponse = IApiResponseSuccess<{ message: string }>;

@Injectable()
export class RemoveSaleLineUseCase {
  private readonly logger = new Logger(RemoveSaleLineUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IRemoveSaleLineRequest
  ): Promise<Result<IRemoveSaleLineResponse, DomainError>> {
    this.logger.log('Removing line from sale', {
      saleId: request.saleId,
      lineId: request.lineId,
      orgId: request.orgId,
    });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`));
    }

    // Remove line from sale
    try {
      sale.removeLine(request.lineId);
    } catch (error) {
      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to remove line from sale'
        )
      );
    }

    // Save sale
    const updatedSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Line removed from sale successfully', {
      saleId: updatedSale.id,
      lineId: request.lineId,
    });

    return ok({
      success: true,
      message: 'Line removed from sale successfully',
      data: { message: 'Line removed successfully' },
      timestamp: new Date().toISOString(),
    });
  }
}
