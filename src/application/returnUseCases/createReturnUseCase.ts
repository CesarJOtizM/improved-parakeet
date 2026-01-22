import { Inject, Injectable, Logger } from '@nestjs/common';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumberGenerationService } from '@returns/domain/services/returnNumberGeneration.service';
import { ReturnMapper } from '@returns/mappers';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
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
    locationId?: string; // Optional for MVP - warehouse is the location
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
  locationId?: string; // Optional for MVP - warehouse is the location
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
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
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

    // Create return entity using mapper
    const returnProps = ReturnMapper.toDomainProps(request, returnNumber);
    const returnEntity = Return.create(returnProps, request.orgId);

    // Add lines if provided using mapper
    if (request.lines && request.lines.length > 0) {
      for (const lineRequest of request.lines) {
        // Validate required fields based on return type
        if (request.type === 'RETURN_CUSTOMER' && !lineRequest.originalSalePrice) {
          return err(
            new ValidationError('Original sale price is required for customer return lines')
          );
        }
        if (request.type === 'RETURN_SUPPLIER' && !lineRequest.originalUnitCost) {
          return err(
            new ValidationError('Original unit cost is required for supplier return lines')
          );
        }

        const line = ReturnMapper.createLineEntity(lineRequest, request.type, request.orgId);
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

    // Use mapper to convert entity to response DTO
    return ok({
      success: true,
      message: 'Return created successfully',
      data: ReturnMapper.toResponseData(savedReturn),
      timestamp: new Date().toISOString(),
    });
  }
}
