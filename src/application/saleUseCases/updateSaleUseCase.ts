import { Inject, Injectable, Logger } from '@nestjs/common';
import { SALE_NOT_FOUND } from '@shared/constants/error-codes';
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
      return err(new NotFoundError(`Sale with ID ${request.id} not found`, SALE_NOT_FOUND));
    }

    // Update sale (returns new instance)
    const updatedSale = sale.update({
      customerReference: request.customerReference,
      externalReference: request.externalReference,
      note: request.note,
    });

    // Save sale
    const savedSale = await this.saleRepository.save(updatedSale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Sale updated successfully', {
      saleId: savedSale.id,
      saleNumber: savedSale.saleNumber.getValue(),
    });

    const totalAmount = savedSale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale updated successfully',
      data: {
        id: savedSale.id,
        saleNumber: savedSale.saleNumber.getValue(),
        status: savedSale.status.getValue(),
        warehouseId: savedSale.warehouseId,
        customerReference: savedSale.customerReference,
        externalReference: savedSale.externalReference,
        note: savedSale.note,
        confirmedAt: savedSale.confirmedAt,
        cancelledAt: savedSale.cancelledAt,
        movementId: savedSale.movementId,
        createdBy: savedSale.createdBy,
        orgId: savedSale.orgId,
        createdAt: savedSale.createdAt,
        updatedAt: savedSale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
