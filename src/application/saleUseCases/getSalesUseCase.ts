import { PrismaService } from '@infrastructure/database/prisma.service';
import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import {
  SaleAllSpecification,
  SaleByCompanySpecification,
  SaleByDateRangeSpecification,
  SaleBySearchSpecification,
  SaleByStatusSpecification,
  SaleByWarehouseSpecification,
} from '@sale/domain/specifications';
import { ISaleResponseData, SaleMapper } from '@sale/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';

export interface IGetSalesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  warehouseId?: string;
  companyId?: string;
  status?: string;
  search?: string;
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
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IGetSalesRequest): Promise<Result<IGetSalesResponse, DomainError>> {
    this.logger.log('Getting sales', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    // Compose specifications based on filters (always start with base)
    const specifications: IPrismaSpecification<Sale>[] = [new SaleAllSpecification()];

    if (request.companyId) {
      specifications.push(new SaleByCompanySpecification(request.companyId));
    }

    if (request.warehouseId) {
      specifications.push(new SaleByWarehouseSpecification(request.warehouseId));
    }

    if (request.status) {
      specifications.push(new SaleByStatusSpecification(request.status));
    }

    if (request.search) {
      specifications.push(new SaleBySearchSpecification(request.search));
    }

    if (request.startDate && request.endDate) {
      specifications.push(new SaleByDateRangeSpecification(request.startDate, request.endDate));
    }

    // Combine all specifications with AND logic — always paginated at DB level
    const finalSpec = specifications.reduce<IPrismaSpecification<Sale>>(
      (acc, spec) => acc.and(spec) as IPrismaSpecification<Sale>,
      specifications[0]
    );

    const result = await this.saleRepository.findBySpecification(finalSpec, request.orgId, {
      skip,
      take,
    });

    const totalPages = Math.ceil(result.total / limit);

    // Convert to response DTOs
    const salesData = SaleMapper.toResponseDataList(result.data, true);

    // Batch resolve warehouse, product, and user names (3 queries instead of N+1)
    await this.enrichWithNames(salesData, request.orgId);

    // Apply sorting on enriched data
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      salesData.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'saleNumber':
            aValue = a.saleNumber || '';
            bValue = b.saleNumber || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'total':
            aValue = a.totalAmount || 0;
            bValue = b.totalAmount || 0;
            break;
          case 'warehouseName':
            aValue = (a.warehouseName || '').toLowerCase();
            bValue = (b.warehouseName || '').toLowerCase();
            break;
          case 'customerReference':
            aValue = (a.customerReference || '').toLowerCase();
            bValue = (b.customerReference || '').toLowerCase();
            break;
          case 'items':
            aValue = a.lines?.length || 0;
            bValue = b.lines?.length || 0;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'confirmedAt':
            aValue = a.confirmedAt ? new Date(a.confirmedAt).getTime() : 0;
            bValue = b.confirmedAt ? new Date(b.confirmedAt).getTime() : 0;
            break;
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

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
    // Collect all unique IDs upfront
    const warehouseIds = [...new Set(salesData.map(s => s.warehouseId))];

    const productIds = new Set<string>();
    for (const sale of salesData) {
      if (sale.lines) {
        for (const line of sale.lines) {
          productIds.add(line.productId);
        }
      }
    }

    const userIds = new Set<string>();
    for (const sale of salesData) {
      if (sale.confirmedBy) userIds.add(sale.confirmedBy);
      if (sale.cancelledBy) userIds.add(sale.cancelledBy);
    }

    // Run all 3 batch queries in parallel (instead of N+1 sequential queries)
    const [warehouses, products, users] = await Promise.all([
      warehouseIds.length > 0
        ? this.prisma.warehouse.findMany({
            where: { id: { in: warehouseIds }, orgId },
            select: { id: true, name: true, code: true },
          })
        : Promise.resolve([]),

      productIds.size > 0
        ? this.prisma.product.findMany({
            where: { id: { in: [...productIds] }, orgId },
            select: { id: true, name: true, sku: true, barcode: true },
          })
        : Promise.resolve([]),

      userIds.size > 0
        ? this.prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const warehouseMap = new Map(
      warehouses.map((w: { id: string; name: string; code: string }) => [
        w.id,
        `${w.name} (${w.code})`,
      ])
    );

    const productMap = new Map(
      products.map((p: { id: string; name: string; sku: string; barcode?: string | null }) => [
        p.id,
        { name: p.name, sku: p.sku, barcode: p.barcode },
      ])
    );

    const userMap = new Map(
      users.map((u: { id: string; firstName: string; lastName: string }) => [
        u.id,
        `${u.firstName} ${u.lastName}`.trim(),
      ])
    );

    // Enrich — pure in-memory, zero DB calls
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
            line.productBarcode = product.barcode ?? undefined;
          }
        }
      }
    }
  }
}
