import { Inject, Injectable, Logger } from '@nestjs/common';
import { SALE_NOT_FOUND, SALE_RETURN_ERROR } from '@shared/constants/error-codes';
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

export interface IMarkSaleReturnedRequest {
  saleId: string;
  orgId: string;
  userId?: string;
}

export type IMarkSaleReturnedResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class MarkSaleReturnedUseCase {
  private readonly logger = new Logger(MarkSaleReturnedUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IMarkSaleReturnedRequest
  ): Promise<Result<IMarkSaleReturnedResponse, DomainError>> {
    this.logger.log('Marking sale as returned', {
      saleId: request.saleId,
      orgId: request.orgId,
    });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`, SALE_NOT_FOUND));
    }

    // Mark as returned
    try {
      sale.markAsReturned(request.userId);
    } catch (error) {
      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to mark sale as returned',
          SALE_RETURN_ERROR
        )
      );
    }

    // Save sale
    const updatedSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Sale marked as returned successfully', {
      saleId: updatedSale.id,
      saleNumber: updatedSale.saleNumber.getValue(),
    });

    const totalAmount = updatedSale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale marked as returned successfully',
      data: {
        id: updatedSale.id,
        saleNumber: updatedSale.saleNumber.getValue(),
        status: updatedSale.status.getValue(),
        warehouseId: updatedSale.warehouseId,
        customerReference: updatedSale.customerReference,
        externalReference: updatedSale.externalReference,
        note: updatedSale.note,
        confirmedAt: updatedSale.confirmedAt,
        confirmedBy: updatedSale.confirmedBy,
        cancelledAt: updatedSale.cancelledAt,
        cancelledBy: updatedSale.cancelledBy,
        pickedAt: updatedSale.pickedAt,
        pickedBy: updatedSale.pickedBy,
        shippedAt: updatedSale.shippedAt,
        shippedBy: updatedSale.shippedBy,
        trackingNumber: updatedSale.trackingNumber,
        shippingCarrier: updatedSale.shippingCarrier,
        shippingNotes: updatedSale.shippingNotes,
        completedAt: updatedSale.completedAt,
        completedBy: updatedSale.completedBy,
        returnedAt: updatedSale.returnedAt,
        returnedBy: updatedSale.returnedBy,
        movementId: updatedSale.movementId,
        createdBy: updatedSale.createdBy,
        orgId: updatedSale.orgId,
        createdAt: updatedSale.createdAt,
        updatedAt: updatedSale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
