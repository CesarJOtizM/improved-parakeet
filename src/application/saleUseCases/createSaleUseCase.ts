import { Inject, Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumberGenerationService } from '@sale/domain/services/saleNumberGeneration.service';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateSaleRequest {
  warehouseId: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  lines?: Array<{
    productId: string;
    locationId: string;
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
  cancelledAt?: Date;
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
    private readonly eventDispatcher: DomainEventDispatcher
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

      // Create sale entity
      const sale = Sale.create(
        {
          saleNumber,
          status: SaleStatus.create('DRAFT'),
          warehouseId: request.warehouseId,
          customerReference: request.customerReference,
          externalReference: request.externalReference,
          note: request.note,
          createdBy: request.createdBy,
        },
        request.orgId
      );

      // Add lines if provided
      if (request.lines && request.lines.length > 0) {
        for (const lineRequest of request.lines) {
          const quantity = Quantity.create(lineRequest.quantity, 6);
          const salePrice = SalePrice.create(
            lineRequest.salePrice,
            lineRequest.currency || 'COP',
            2
          );

          const line = SaleLine.create(
            {
              productId: lineRequest.productId,
              locationId: lineRequest.locationId,
              quantity,
              salePrice,
            },
            request.orgId
          );

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

      const totalAmount = savedSale.getTotalAmount();

      const response: ICreateSaleResponse = {
        success: true,
        message: 'Sale created successfully',
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
