import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface ICancelSaleRequest {
  id: string;
  reason?: string;
  orgId: string;
}

export type ICancelSaleResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class CancelSaleUseCase {
  private readonly logger = new Logger(CancelSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: ICancelSaleRequest): Promise<ICancelSaleResponse> {
    this.logger.log('Cancelling sale', { saleId: request.id, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${request.id} not found`);
    }

    // Cancel sale
    try {
      sale.cancel(request.reason);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to cancel sale'
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

    return {
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
        cancelledAt: cancelledSale.cancelledAt,
        movementId: cancelledSale.movementId,
        createdBy: cancelledSale.createdBy,
        orgId: cancelledSale.orgId,
        createdAt: cancelledSale.createdAt,
        updatedAt: cancelledSale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
