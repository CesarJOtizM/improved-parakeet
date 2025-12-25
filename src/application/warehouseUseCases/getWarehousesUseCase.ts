import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IWarehouseData } from './createWarehouseUseCase';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IGetWarehousesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetWarehousesResponse = IPaginatedResponse<IWarehouseData>;

@Injectable()
export class GetWarehousesUseCase {
  private readonly logger = new Logger(GetWarehousesUseCase.name);

  constructor(
    @Inject('WarehouseRepository') private readonly warehouseRepository: IWarehouseRepository
  ) {}

  async execute(request: IGetWarehousesRequest): Promise<IGetWarehousesResponse> {
    this.logger.log('Getting warehouses', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      isActive: request.isActive,
      search: request.search,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get warehouses based on filters
    let warehouses;
    if (request.isActive !== undefined) {
      if (request.isActive) {
        warehouses = await this.warehouseRepository.findActive(request.orgId);
      } else {
        warehouses = await this.warehouseRepository.findAll(request.orgId);
        warehouses = warehouses.filter(w => !w.isActive);
      }
    } else {
      warehouses = await this.warehouseRepository.findAll(request.orgId);
    }

    // Apply search filter if provided
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      warehouses = warehouses.filter(
        warehouse =>
          warehouse.name.toLowerCase().includes(searchLower) ||
          warehouse.code.getValue().toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      warehouses.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'code':
            aValue = a.code.getValue();
            bValue = b.code.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const total = warehouses.length;
    const paginatedWarehouses = warehouses.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Warehouses retrieved successfully',
      data: paginatedWarehouses.map(warehouse => ({
        id: warehouse.id,
        code: warehouse.code.getValue(),
        name: warehouse.name,
        address: warehouse.address
          ? {
              street: undefined,
              city: undefined,
              state: undefined,
              zipCode: undefined,
              country: undefined,
            }
          : undefined,
        isActive: warehouse.isActive,
        orgId: warehouse.orgId!,
        createdAt: warehouse.createdAt,
        updatedAt: warehouse.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
