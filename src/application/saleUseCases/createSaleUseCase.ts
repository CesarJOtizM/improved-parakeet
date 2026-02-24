import { Inject, Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumberGenerationService } from '@sale/domain/services/saleNumberGeneration.service';
import { SaleMapper } from '@sale/mappers';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateSaleRequest {
  warehouseId: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  lines?: Array<{
    productId: string;
    locationId?: string;
    quantity: number;
    salePrice: number;
    currency?: string;
  }>;
  createdBy: string;
  orgId: string;
}

export interface ISaleData {
  id: string;
  saleNumber: string;
  status: string;
  warehouseId: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  pickedAt?: Date;
  pickedBy?: string;
  shippedAt?: Date;
  shippedBy?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingNotes?: string;
  completedAt?: Date;
  completedBy?: string;
  movementId?: string;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: number;
  currency: string;
}

export type ICreateSaleResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class CreateSaleUseCase {
  private readonly logger = new Logger(CreateSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(request: ICreateSaleRequest): Promise<Result<ICreateSaleResponse, DomainError>> {
    this.logger.log('Creating sale', { warehouseId: request.warehouseId, orgId: request.orgId });

    try {
      // Validate warehouse exists
      const warehouse = await this.warehouseRepository.findById(request.warehouseId, request.orgId);
      if (!warehouse) {
        return err(
          new NotFoundError(
            `Warehouse with ID ${request.warehouseId} not found`,
            'WAREHOUSE_NOT_FOUND',
            {
              warehouseId: request.warehouseId,
              orgId: request.orgId,
            }
          )
        );
      }

      // Generate sale number
      const saleNumber = await SaleNumberGenerationService.generateNextSaleNumber(
        request.orgId,
        this.saleRepository
      );

      // Create sale entity using mapper
      const saleProps = SaleMapper.toDomainProps(request, saleNumber);
      const sale = Sale.create(saleProps, request.orgId);

      // Add lines if provided using mapper
      if (request.lines && request.lines.length > 0) {
        for (const lineRequest of request.lines) {
          const line = SaleMapper.createLineEntity(lineRequest, request.orgId);
          sale.addLine(line);
        }
      }

      // Save sale
      const savedSale = await this.saleRepository.save(sale);

      // Dispatch domain events
      savedSale.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedSale.domainEvents);
      savedSale.clearEvents();

      this.logger.log('Sale created successfully', {
        saleId: savedSale.id,
        saleNumber: savedSale.saleNumber.getValue(),
      });

      // Use mapper to convert entity to response DTO
      const response: ICreateSaleResponse = {
        success: true,
        message: 'Sale created successfully',
        data: SaleMapper.toResponseData(savedSale),
        timestamp: new Date().toISOString(),
      };

      return ok(response);
    } catch (error) {
      this.logger.error('Error creating sale', {
        error: error instanceof Error ? error.message : 'Unknown error',
        warehouseId: request.warehouseId,
        orgId: request.orgId,
      });

      if (error instanceof Error) {
        return err(new ValidationError(error.message, 'SALE_CREATION_ERROR'));
      }

      return err(new ValidationError('Failed to create sale', 'SALE_CREATION_ERROR'));
    }
  }
}
