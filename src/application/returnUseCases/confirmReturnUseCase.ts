import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InventoryInGeneratedEvent } from '@returns/domain/events/inventoryInGenerated.event';
import { InventoryOutGeneratedEvent } from '@returns/domain/events/inventoryOutGenerated.event';
import { InventoryIntegrationService } from '@returns/domain/services/inventoryIntegration.service';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IConfirmReturnRequest {
  id: string;
  orgId: string;
}

export type IConfirmReturnResponse = IApiResponseSuccess<
  IReturnData & { returnMovementId: string }
>;

@Injectable()
export class ConfirmReturnUseCase {
  private readonly logger = new Logger(ConfirmReturnUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: IConfirmReturnRequest): Promise<IConfirmReturnResponse> {
    this.logger.log('Confirming return', { returnId: request.id, orgId: request.orgId });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      throw new NotFoundException(`Return with ID ${request.id} not found`);
    }

    // Validate return can be confirmed
    const validationResult = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `Return cannot be confirmed: ${validationResult.errors.join(', ')}`
      );
    }

    // Validate return quantity based on type
    if (returnEntity.type.isCustomerReturn()) {
      const quantityValidation = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        this.saleRepository
      );
      if (!quantityValidation.isValid) {
        throw new BadRequestException(
          `Invalid return quantities: ${quantityValidation.errors.join(', ')}`
        );
      }
    } else {
      // Supplier return
      const quantityValidation = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        this.movementRepository
      );
      if (!quantityValidation.isValid) {
        throw new BadRequestException(
          `Invalid return quantities: ${quantityValidation.errors.join(', ')}`
        );
      }
    }

    // Generate movement from return
    let movement;
    if (returnEntity.type.isCustomerReturn()) {
      movement = InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity);
    } else {
      movement = InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity);
    }

    // Save movement
    const savedMovement = await this.movementRepository.save(movement);

    // Post movement (this will trigger stock update and emit MovementPostedEvent)
    savedMovement.post();
    const postedMovement = await this.movementRepository.save(savedMovement);

    // Confirm return with returnMovementId
    returnEntity.confirm(postedMovement.id);

    // Save return
    const confirmedReturn = await this.returnRepository.save(returnEntity);

    // Dispatch return domain events
    confirmedReturn.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(confirmedReturn.domainEvents);
    confirmedReturn.clearEvents();

    // Dispatch inventory event
    let inventoryEvent;
    if (returnEntity.type.isCustomerReturn()) {
      inventoryEvent = new InventoryInGeneratedEvent(
        confirmedReturn.id,
        postedMovement.id,
        confirmedReturn.orgId
      );
    } else {
      inventoryEvent = new InventoryOutGeneratedEvent(
        confirmedReturn.id,
        postedMovement.id,
        confirmedReturn.orgId
      );
    }
    inventoryEvent.markForDispatch();
    await this.eventDispatcher.dispatchEvents([inventoryEvent]);

    this.logger.log('Return confirmed successfully', {
      returnId: confirmedReturn.id,
      returnNumber: confirmedReturn.returnNumber.getValue(),
      movementId: postedMovement.id,
    });

    const totalAmount = confirmedReturn.getTotalAmount();
    const lines = confirmedReturn.getLines().map(line => {
      const lineTotal = line.getTotalPrice();
      return {
        id: line.id,
        productId: line.productId,
        locationId: line.locationId,
        quantity: line.quantity.getNumericValue(),
        originalSalePrice: line.originalSalePrice?.getAmount(),
        originalUnitCost: line.originalUnitCost?.getAmount(),
        currency: line.currency,
        totalPrice: lineTotal?.getAmount() || 0,
      };
    });

    return {
      success: true,
      message: 'Return confirmed successfully',
      data: {
        id: confirmedReturn.id,
        returnNumber: confirmedReturn.returnNumber.getValue(),
        status: confirmedReturn.status.getValue(),
        type: confirmedReturn.type.getValue(),
        reason: confirmedReturn.reason.getValue(),
        warehouseId: confirmedReturn.warehouseId,
        saleId: confirmedReturn.saleId,
        sourceMovementId: confirmedReturn.sourceMovementId,
        returnMovementId: confirmedReturn.returnMovementId!,
        note: confirmedReturn.note,
        confirmedAt: confirmedReturn.confirmedAt,
        cancelledAt: confirmedReturn.cancelledAt,
        createdBy: confirmedReturn.createdBy,
        orgId: confirmedReturn.orgId,
        createdAt: confirmedReturn.createdAt,
        updatedAt: confirmedReturn.updatedAt,
        totalAmount: totalAmount?.getAmount(),
        currency: totalAmount?.getCurrency(),
        lines,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
