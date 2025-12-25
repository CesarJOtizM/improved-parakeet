import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseBusinessRulesService } from '@warehouse/domain/services/warehouseBusinessRules.service';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateWarehouseRequest {
  code: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive?: boolean;
  orgId: string;
}

export interface IWarehouseData {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateWarehouseResponse = IApiResponseSuccess<IWarehouseData>;

@Injectable()
export class CreateWarehouseUseCase {
  private readonly logger = new Logger(CreateWarehouseUseCase.name);

  constructor(
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: ICreateWarehouseRequest): Promise<ICreateWarehouseResponse> {
    this.logger.log('Creating warehouse', { code: request.code, orgId: request.orgId });

    try {
      // Create value objects
      const code = WarehouseCode.create(request.code);
      const address = request.address
        ? Address.create(
            request.address.street,
            request.address.city,
            request.address.state,
            request.address.zipCode,
            request.address.country
          )
        : undefined;

      // Validate code uniqueness using business rules
      await WarehouseBusinessRulesService.validateCodeUniquenessOrThrow(
        code,
        request.orgId,
        this.warehouseRepository
      );

      // Create warehouse entity
      const warehouse = Warehouse.create(
        {
          code,
          name: request.name,
          address,
          isActive: request.isActive !== undefined ? request.isActive : true,
        },
        request.orgId
      );

      // Save warehouse
      const savedWarehouse = await this.warehouseRepository.save(warehouse);

      // Dispatch domain events
      savedWarehouse.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedWarehouse.domainEvents);
      savedWarehouse.clearEvents();

      this.logger.log('Warehouse created successfully', {
        warehouseId: savedWarehouse.id,
        code: savedWarehouse.code.getValue(),
      });

      return {
        success: true,
        message: 'Warehouse created successfully',
        data: {
          id: savedWarehouse.id,
          code: savedWarehouse.code.getValue(),
          name: savedWarehouse.name,
          description: request.description,
          address: savedWarehouse.address
            ? {
                street: savedWarehouse.address.getValue().street,
                city: savedWarehouse.address.getValue().city,
                state: savedWarehouse.address.getValue().state,
                zipCode: savedWarehouse.address.getValue().zipCode,
                country: savedWarehouse.address.getValue().country,
              }
            : undefined,
          isActive: savedWarehouse.isActive,
          orgId: savedWarehouse.orgId!,
          createdAt: savedWarehouse.createdAt,
          updatedAt: savedWarehouse.updatedAt,
        } as IWarehouseData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error creating warehouse', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: request.code,
        orgId: request.orgId,
      });

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create warehouse'
      );
    }
  }
}
