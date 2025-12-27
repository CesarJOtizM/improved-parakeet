import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IUpdateSaleRequest {
  id: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  orgId: string;
}

export type IUpdateSaleResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class UpdateSaleUseCase {
  private readonly logger = new Logger(UpdateSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(request: IUpdateSaleRequest): Promise<Result<IUpdateSaleResponse, DomainError>> {
    this.logger.log('Updating sale', { saleId: request.id, orgId: request.orgId });

    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`));
    }

    // Update sale
    sale.update({
      customerReference: request.customerReference,
      externalReference: request.externalReference,
      note: request.note,
    });

    // Save sale
    const updatedSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Sale updated successfully', {
      saleId: updatedSale.id,
      saleNumber: updatedSale.saleNumber.getValue(),
    });

    const totalAmount = updatedSale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale updated successfully',
      data: {
        id: updatedSale.id,
        saleNumber: updatedSale.saleNumber.getValue(),
        status: updatedSale.status.getValue(),
        warehouseId: updatedSale.warehouseId,
        customerReference: updatedSale.customerReference,
        externalReference: updatedSale.externalReference,
        note: updatedSale.note,
        confirmedAt: updatedSale.confirmedAt,
        cancelledAt: updatedSale.cancelledAt,
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
