import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleMapper } from '@sale/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IGetSalesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetSalesResponse = IPaginatedResponse<ISaleData>;

@Injectable()
export class GetSalesUseCase {
  private readonly logger = new Logger(GetSalesUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository
  ) {}

  async execute(request: IGetSalesRequest): Promise<Result<IGetSalesResponse, DomainError>> {
    this.logger.log('Getting sales', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      warehouseId: request.warehouseId,
      status: request.status,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get sales based on filters
    let sales;
    if (request.warehouseId) {
      sales = await this.saleRepository.findByWarehouse(request.warehouseId, request.orgId);
    } else if (request.status) {
      sales = await this.saleRepository.findByStatus(request.status, request.orgId);
    } else if (request.startDate && request.endDate) {
      sales = await this.saleRepository.findByDateRange(
        request.startDate,
        request.endDate,
        request.orgId
      );
    } else {
      sales = await this.saleRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.warehouseId && sales.length > 0) {
      sales = sales.filter(s => s.warehouseId === request.warehouseId);
    }

    if (request.status && sales.length > 0) {
      sales = sales.filter(s => s.status.getValue() === request.status);
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      sales.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'saleNumber':
            aValue = a.saleNumber.getValue();
            bValue = b.saleNumber.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'confirmedAt':
            aValue = a.confirmedAt?.getTime() || 0;
            bValue = b.confirmedAt?.getTime() || 0;
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
    const total = sales.length;
    const paginatedSales = sales.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // Use mapper to convert entities to response DTOs
    return ok({
      success: true,
      message: 'Sales retrieved successfully',
      data: SaleMapper.toResponseDataList(paginatedSales),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
