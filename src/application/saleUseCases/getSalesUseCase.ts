import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import {
  SaleByDateRangeSpecification,
  SaleByStatusSpecification,
  SaleByWarehouseSpecification,
} from '@sale/domain/specifications';
import { SaleMapper } from '@sale/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';

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
  includeLines?: boolean; // Optional: include lines in response (default: true)
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
    const { skip, take } = QueryPagination.fromPage(page, limit);

    // Compose specifications based on filters
    const specifications: IPrismaSpecification<Sale>[] = [];

    if (request.warehouseId) {
      specifications.push(new SaleByWarehouseSpecification(request.warehouseId));
    }

    if (request.status) {
      specifications.push(
        new SaleByStatusSpecification(request.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED')
      );
    }

    if (request.startDate && request.endDate) {
      specifications.push(new SaleByDateRangeSpecification(request.startDate, request.endDate));
    }

    // Combine all specifications with AND logic
    let result;
    if (specifications.length > 0) {
      const finalSpec = specifications.reduce<IPrismaSpecification<Sale>>(
        (acc, spec) => acc.and(spec) as IPrismaSpecification<Sale>,
        specifications[0]
      );
      result = await this.saleRepository.findBySpecification(finalSpec, request.orgId, {
        skip,
        take,
      });
    } else {
      // Fallback to findAll for backward compatibility
      const allSales = await this.saleRepository.findAll(request.orgId);
      const total = allSales.length;
      const paginatedSales = allSales.slice(skip, skip + take);
      result = {
        data: paginatedSales,
        total,
        hasMore: skip + take < total,
      };
    }

    // Apply sorting (in-memory for now, could be moved to Prisma orderBy)
    let sortedSales = result.data;
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      sortedSales = [...result.data].sort((a: Sale, b: Sale) => {
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

    const totalPages = Math.ceil(result.total / limit);

    // Use mapper to convert entities to response DTOs
    return ok({
      success: true,
      message: 'Sales retrieved successfully',
      data: SaleMapper.toResponseDataList(sortedSales),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
