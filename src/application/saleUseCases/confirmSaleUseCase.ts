import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InventoryOutGeneratedEvent } from '@sale/domain/events/inventoryOutGenerated.event';
import { InventoryIntegrationService } from '@sale/domain/services/inventoryIntegration.service';
import { SaleValidationService } from '@sale/domain/services/saleValidation.service';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IConfirmSaleRequest {
  id: string;
  orgId: string;
}

export type IConfirmSaleResponse = IApiResponseSuccess<ISaleData & { movementId: string }>;

@Injectable()
export class ConfirmSaleUseCase {
  private readonly logger = new Logger(ConfirmSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: IConfirmSaleRequest): Promise<IConfirmSaleResponse> {
    this.logger.log('Confirming sale', { saleId: request.id, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${request.id} not found`);
    }

    // Validate sale can be confirmed
    const validationResult = SaleValidationService.validateSaleCanBeConfirmed(sale);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `Sale cannot be confirmed: ${validationResult.errors.join(', ')}`
      );
    }

    // Validate stock availability
    const stockValidation = await SaleValidationService.validateStockAvailability(
      sale,
      this.stockRepository
    );
    if (!stockValidation.isValid) {
      throw new BadRequestException(`Insufficient stock: ${stockValidation.errors.join(', ')}`);
    }

    // Generate movement from sale
    const movement = InventoryIntegrationService.generateMovementFromSale(sale);

    // Save movement
    const savedMovement = await this.movementRepository.save(movement);

    // Post movement (this will trigger stock update and emit MovementPostedEvent)
    savedMovement.post();
    const postedMovement = await this.movementRepository.save(savedMovement);

    // Confirm sale with movementId
    sale.confirm(postedMovement.id);

    // Save sale
    const confirmedSale = await this.saleRepository.save(sale);

    // Dispatch sale domain events
    confirmedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(confirmedSale.domainEvents);
    confirmedSale.clearEvents();

    // Dispatch inventory out generated event
    const inventoryEvent = new InventoryOutGeneratedEvent(
      confirmedSale.id,
      postedMovement.id,
      confirmedSale.orgId
    );
    inventoryEvent.markForDispatch();
    await this.eventDispatcher.dispatchEvents([inventoryEvent]);

    this.logger.log('Sale confirmed successfully', {
      saleId: confirmedSale.id,
      saleNumber: confirmedSale.saleNumber.getValue(),
      movementId: postedMovement.id,
    });

    const totalAmount = confirmedSale.getTotalAmount();

    return {
      success: true,
      message: 'Sale confirmed successfully',
      data: {
        id: confirmedSale.id,
        saleNumber: confirmedSale.saleNumber.getValue(),
        status: confirmedSale.status.getValue(),
        warehouseId: confirmedSale.warehouseId,
        customerReference: confirmedSale.customerReference,
        externalReference: confirmedSale.externalReference,
        note: confirmedSale.note,
        confirmedAt: confirmedSale.confirmedAt,
        cancelledAt: confirmedSale.cancelledAt,
        movementId: confirmedSale.movementId!,
        createdBy: confirmedSale.createdBy,
        orgId: confirmedSale.orgId,
        createdAt: confirmedSale.createdAt,
        updatedAt: confirmedSale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
