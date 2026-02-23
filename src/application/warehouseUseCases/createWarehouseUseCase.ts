import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  err,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { fromThrowable } from '@shared/domain/result/resultUtils';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
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
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICreateWarehouseRequest
  ): Promise<Result<ICreateWarehouseResponse, DomainError>> {
    this.logger.log('Creating warehouse', { code: request.code, orgId: request.orgId });

    // Create value objects with Result pattern
    const codeResult = fromThrowable(
      () => WarehouseCode.create(request.code),
      e => new ValidationError(e instanceof Error ? e.message : 'Invalid warehouse code')
    );
    if (codeResult.isErr()) {
      return err(codeResult.unwrapErr());
    }
    const code = codeResult.unwrap();

    const address = request.address ? Address.create(JSON.stringify(request.address)) : undefined;

    // Validate code uniqueness using business rules
    const codeExists = await this.warehouseRepository.existsByCode(code.getValue(), request.orgId);
    if (codeExists) {
      return err(
        new ConflictError(`Warehouse code '${code.getValue()}' already exists in this organization`)
      );
    }

    // Create warehouse entity
    const warehouse = Warehouse.create(
      {
        code,
        name: request.name,
        description: request.description,
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

    return ok({
      success: true,
      message: 'Warehouse created successfully',
      data: {
        id: savedWarehouse.id,
        code: savedWarehouse.code.getValue(),
        name: savedWarehouse.name,
        description: request.description,
        address: request.address
          ? {
              street: request.address.street,
              city: request.address.city,
              state: request.address.state,
              zipCode: request.address.zipCode,
              country: request.address.country,
            }
          : undefined,
        isActive: savedWarehouse.isActive,
        orgId: savedWarehouse.orgId!,
        createdAt: savedWarehouse.createdAt,
        updatedAt: savedWarehouse.updatedAt,
      } as IWarehouseData,
      timestamp: new Date().toISOString(),
    });
  }
}
