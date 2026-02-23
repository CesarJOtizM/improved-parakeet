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

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface ICancelSaleRequest {
  id: string;
  reason?: string;
  orgId: string;
  userId?: string;
}

export type ICancelSaleResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class CancelSaleUseCase {
  private readonly logger = new Logger(CancelSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(request: ICancelSaleRequest): Promise<Result<ICancelSaleResponse, DomainError>> {
    this.logger.log('Cancelling sale', { saleId: request.id, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`));
    }

    // Cancel sale
    try {
      sale.cancel(request.reason, request.userId);
    } catch (error) {
      return err(
        new BusinessRuleError(error instanceof Error ? error.message : 'Failed to cancel sale')
      );
    }

    // Save sale
    const cancelledSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    cancelledSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(cancelledSale.domainEvents);
    cancelledSale.clearEvents();

    this.logger.log('Sale cancelled successfully', {
      saleId: cancelledSale.id,
      saleNumber: cancelledSale.saleNumber.getValue(),
    });

    const totalAmount = cancelledSale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale cancelled successfully',
      data: {
        id: cancelledSale.id,
        saleNumber: cancelledSale.saleNumber.getValue(),
        status: cancelledSale.status.getValue(),
        warehouseId: cancelledSale.warehouseId,
        customerReference: cancelledSale.customerReference,
        externalReference: cancelledSale.externalReference,
        note: cancelledSale.note,
        confirmedAt: cancelledSale.confirmedAt,
        confirmedBy: cancelledSale.confirmedBy,
        cancelledAt: cancelledSale.cancelledAt,
        cancelledBy: cancelledSale.cancelledBy,
        movementId: cancelledSale.movementId,
        createdBy: cancelledSale.createdBy,
        orgId: cancelledSale.orgId,
        createdAt: cancelledSale.createdAt,
        updatedAt: cancelledSale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
