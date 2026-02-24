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
import type { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';

export interface IShipSaleRequest {
  id: string;
  orgId: string;
  userId?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingNotes?: string;
}

export type IShipSaleResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class ShipSaleUseCase {
  private readonly logger = new Logger(ShipSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(request: IShipSaleRequest): Promise<Result<IShipSaleResponse, DomainError>> {
    this.logger.log('Shipping sale', {
      saleId: request.id,
      orgId: request.orgId,
    });

    // Validate org has picking enabled
    const org = await this.organizationRepository.findById(request.orgId);
    if (!org) {
      return err(new NotFoundError(`Organization with ID ${request.orgId} not found`));
    }

    const pickingEnabled = org.getSetting('pickingEnabled');
    if (!pickingEnabled) {
      return err(new BusinessRuleError('Picking/shipping is not enabled for this organization'));
    }

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`));
    }

    // Ship sale
    try {
      sale.ship(
        request.trackingNumber,
        request.shippingCarrier,
        request.shippingNotes,
        request.userId
      );
    } catch (error) {
      return err(
        new BusinessRuleError(error instanceof Error ? error.message : 'Failed to ship sale')
      );
    }

    // Save sale
    const updatedSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Sale shipped successfully', {
      saleId: updatedSale.id,
      saleNumber: updatedSale.saleNumber.getValue(),
      trackingNumber: request.trackingNumber,
    });

    const totalAmount = updatedSale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale shipped successfully',
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
