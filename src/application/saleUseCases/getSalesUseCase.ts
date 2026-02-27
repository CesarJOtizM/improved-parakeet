import { PrismaService } from '@infrastructure/database/prisma.service';
import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import {
  SaleByDateRangeSpecification,
  SaleByStatusSpecification,
  SaleByWarehouseSpecification,
} from '@sale/domain/specifications';
import { ISaleResponseData, SaleMapper } from '@sale/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

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
  includeLines?: boolean;
}

export type IGetSalesResponse = IPaginatedResponse<ISaleResponseData>;

@Injectable()
export class GetSalesUseCase {
  private readonly logger = new Logger(GetSalesUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService
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
          case 'total':
            aValue = a.getTotalAmount().getAmount();
            bValue = b.getTotalAmount().getAmount();
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

    // Convert to response DTOs
    const salesData = SaleMapper.toResponseDataList(sortedSales, true);

    // Batch resolve warehouse and product names
    await this.enrichWithNames(salesData, request.orgId);

    return ok({
      success: true,
      message: 'Sales retrieved successfully',
      data: salesData,
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

  private async enrichWithNames(salesData: ISaleResponseData[], orgId: string): Promise<void> {
    // Collect unique warehouse IDs
    const warehouseIds = [...new Set(salesData.map(s => s.warehouseId))];
    const warehouseMap = new Map<string, string>();

    for (const wId of warehouseIds) {
      try {
        const warehouse = await this.warehouseRepository.findById(wId, orgId);
        if (warehouse) {
          warehouseMap.set(wId, `${warehouse.name} (${warehouse.code.getValue()})`);
        }
      } catch {
        this.logger.warn('Could not resolve warehouse', { warehouseId: wId });
      }
    }

    // Collect unique product IDs from all lines
    const productIds = new Set<string>();
    for (const sale of salesData) {
      if (sale.lines) {
        for (const line of sale.lines) {
          productIds.add(line.productId);
        }
      }
    }

    const productMap = new Map<string, { name: string; sku: string }>();
    for (const pId of productIds) {
      try {
        const product = await this.productRepository.findById(pId, orgId);
        if (product) {
          productMap.set(pId, { name: product.name.getValue(), sku: product.sku.getValue() });
        }
      } catch {
        this.logger.warn('Could not resolve product', { productId: pId });
      }
    }

    // Collect unique user IDs for confirmedBy/cancelledBy
    const userIds = new Set<string>();
    for (const sale of salesData) {
      if (sale.confirmedBy) userIds.add(sale.confirmedBy);
      if (sale.cancelledBy) userIds.add(sale.cancelledBy);
    }

    const userMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        if (user) {
          userMap.set(userId, `${user.firstName} ${user.lastName}`.trim());
        }
      } catch {
        this.logger.warn('Could not resolve user', { userId });
      }
    }

    // Enrich the response data
    for (const sale of salesData) {
      sale.warehouseName = warehouseMap.get(sale.warehouseId);
      if (sale.confirmedBy) {
        sale.confirmedByName = userMap.get(sale.confirmedBy);
      }
      if (sale.cancelledBy) {
        sale.cancelledByName = userMap.get(sale.cancelledBy);
      }
      if (sale.lines) {
        for (const line of sale.lines) {
          const product = productMap.get(line.productId);
          if (product) {
            line.productName = product.name;
            line.productSku = product.sku;
          }
        }
      }
    }
  }
}
