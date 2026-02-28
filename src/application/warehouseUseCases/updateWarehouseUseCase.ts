import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseMapper } from '@warehouse/mappers/warehouse.mapper';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import type { IStockRepository } from '@stock/domain/ports/repositories';

export interface IUpdateWarehouseRequest {
  warehouseId: string;
  orgId: string;
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive?: boolean;
  updatedBy?: string;
}

export type IUpdateWarehouseResponse = IApiResponseSuccess<
  ReturnType<typeof WarehouseMapper.toResponseData>
>;

@Injectable()
export class UpdateWarehouseUseCase {
  private readonly logger = new Logger(UpdateWarehouseUseCase.name);

  constructor(
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository
  ) {}

  async execute(
    request: IUpdateWarehouseRequest
  ): Promise<Result<IUpdateWarehouseResponse, DomainError>> {
    this.logger.log('Updating warehouse', {
      warehouseId: request.warehouseId,
      orgId: request.orgId,
    });

    try {
      const warehouse = await this.warehouseRepository.findById(request.warehouseId, request.orgId);

      if (!warehouse) {
        return err(
          new NotFoundError('Warehouse not found', 'WAREHOUSE_NOT_FOUND', {
            warehouseId: request.warehouseId,
            orgId: request.orgId,
          })
        );
      }

      if (request.isActive === false && warehouse.isActive) {
        const stock = await this.stockRepository.findAll(request.orgId, {
          warehouseIds: [request.warehouseId],
        });

        const hasStock = stock.some(s => s.quantity.isPositive());

        if (hasStock) {
          return err(
            new ValidationError(
              'Cannot deactivate warehouse with existing stock. Transfer or adjust stock to zero first.',
              'WAREHOUSE_HAS_STOCK'
            )
          );
        }
      }

      // Build update props
      const updateProps: Record<string, unknown> = {};

      if (request.name !== undefined) {
        updateProps.name = request.name;
      }

      if (request.address !== undefined) {
        const addressString = JSON.stringify(request.address);
        updateProps.address = Address.create(addressString);
      }

      if (request.isActive !== undefined) {
        updateProps.isActive = request.isActive;
        updateProps.statusChangedBy = request.updatedBy;
      }

      if (Object.keys(updateProps).length > 0) {
        warehouse.update(updateProps);
      }

      const savedWarehouse = await this.warehouseRepository.save(warehouse);

      return ok({
        success: true,
        message: 'Warehouse updated successfully',
        data: WarehouseMapper.toResponseData(savedWarehouse),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating warehouse', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        warehouseId: request.warehouseId,
        orgId: request.orgId,
      });

      return err(
        new ValidationError(
          `Failed to update warehouse: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'WAREHOUSE_UPDATE_ERROR'
        )
      );
    }
  }
}
