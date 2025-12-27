import { Inject, Injectable, Logger } from '@nestjs/common';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumberGenerationService } from '@returns/domain/services/returnNumberGeneration.service';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import {
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateReturnRequest {
  type: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
  warehouseId: string;
  saleId?: string; // Required for customer returns
  sourceMovementId?: string; // Required for supplier returns
  reason?: string;
  note?: string;
  lines?: Array<{
    productId: string;
    locationId: string;
    quantity: number;
    originalSalePrice?: number; // Required for customer returns
    originalUnitCost?: number; // Required for supplier returns
    currency?: string;
  }>;
  createdBy: string;
  orgId: string;
}

export interface IReturnLineData {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  originalSalePrice?: number;
  originalUnitCost?: number;
  currency: string;
  totalPrice: number;
}

export interface IReturnData {
  id: string;
  returnNumber: string;
  status: string;
  type: string;
  reason: string | null;
  warehouseId: string;
  saleId?: string;
  sourceMovementId?: string;
  returnMovementId?: string;
  note?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmount?: number;
  currency?: string;
  lines: IReturnLineData[];
}

export type ICreateReturnResponse = IApiResponseSuccess<IReturnData>;

@Injectable()
export class CreateReturnUseCase {
  private readonly logger = new Logger(CreateReturnUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(
    request: ICreateReturnRequest
  ): Promise<Result<ICreateReturnResponse, DomainError>> {
    this.logger.log('Creating return', {
      type: request.type,
      warehouseId: request.warehouseId,
      orgId: request.orgId,
    });

    // Validate warehouse exists
    const warehouse = await this.warehouseRepository.findById(request.warehouseId, request.orgId);
    if (!warehouse) {
      return err(new NotFoundError(`Warehouse with ID ${request.warehouseId} not found`));
    }

    // Validate type-specific requirements
    if (request.type === 'RETURN_CUSTOMER' && !request.saleId) {
      return err(new ValidationError('Sale ID is required for customer returns'));
    }
    if (request.type === 'RETURN_SUPPLIER' && !request.sourceMovementId) {
      return err(new ValidationError('Source movement ID is required for supplier returns'));
    }

    // Generate return number
    const returnNumber = await ReturnNumberGenerationService.generateNextReturnNumber(
      request.orgId,
      this.returnRepository
    );

    // Create return entity
    const returnEntity = Return.create(
      {
        returnNumber,
        status: ReturnStatus.create('DRAFT'),
        type: ReturnType.create(request.type),
        reason: ReturnReason.create(request.reason),
        warehouseId: request.warehouseId,
        saleId: request.type === 'RETURN_CUSTOMER' ? request.saleId : undefined,
        sourceMovementId: request.type === 'RETURN_SUPPLIER' ? request.sourceMovementId : undefined,
        note: request.note,
        createdBy: request.createdBy,
      },
      request.orgId
    );

    // Add lines if provided
    if (request.lines && request.lines.length > 0) {
      const returnType = ReturnType.create(request.type);
      for (const lineRequest of request.lines) {
        const quantity = Quantity.create(lineRequest.quantity, 6);
        const currency = lineRequest.currency || 'COP';

        let originalSalePrice: SalePrice | undefined;
        let originalUnitCost: Money | undefined;

        if (request.type === 'RETURN_CUSTOMER') {
          if (!lineRequest.originalSalePrice) {
            return err(
              new ValidationError('Original sale price is required for customer return lines')
            );
          }
          originalSalePrice = SalePrice.create(lineRequest.originalSalePrice, currency, 2);
        } else {
          if (!lineRequest.originalUnitCost) {
            return err(
              new ValidationError('Original unit cost is required for supplier return lines')
            );
          }
          originalUnitCost = Money.create(lineRequest.originalUnitCost, currency, 2);
        }

        const line = ReturnLine.create(
          {
            productId: lineRequest.productId,
            locationId: lineRequest.locationId,
            quantity,
            originalSalePrice,
            originalUnitCost,
            currency,
          },
          request.orgId,
          returnType
        );

        returnEntity.addLine(line);
      }
    }

    // Save return
    const savedReturn = await this.returnRepository.save(returnEntity);

    // Dispatch domain events
    savedReturn.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(savedReturn.domainEvents);
    savedReturn.clearEvents();

    this.logger.log('Return created successfully', {
      returnId: savedReturn.id,
      returnNumber: savedReturn.returnNumber.getValue(),
    });

    const totalAmount = savedReturn.getTotalAmount();
    const lines = savedReturn.getLines().map(line => {
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

    return ok({
      success: true,
      message: 'Return created successfully',
      data: {
        id: savedReturn.id,
        returnNumber: savedReturn.returnNumber.getValue(),
        status: savedReturn.status.getValue(),
        type: savedReturn.type.getValue(),
        reason: savedReturn.reason.getValue(),
        warehouseId: savedReturn.warehouseId,
        saleId: savedReturn.saleId,
        sourceMovementId: savedReturn.sourceMovementId,
        returnMovementId: savedReturn.returnMovementId,
        note: savedReturn.note,
        confirmedAt: savedReturn.confirmedAt,
        cancelledAt: savedReturn.cancelledAt,
        createdBy: savedReturn.createdBy,
        orgId: savedReturn.orgId,
        createdAt: savedReturn.createdAt,
        updatedAt: savedReturn.updatedAt,
        totalAmount: totalAmount?.getAmount(),
        currency: totalAmount?.getCurrency(),
        lines,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
