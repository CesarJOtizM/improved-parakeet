import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Movement } from '@movement/domain/entities/movement.entity';
import {
  MovementByDateRangeSpecification,
  MovementByProductSpecification,
  MovementByStatusSpecification,
  MovementByTypeSpecification,
  MovementByWarehouseSpecification,
} from '@movement/domain/specifications';
import { MovementMapper, type IProductInfo } from '@movement/mappers';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, Result, ok } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';
import { PrismaService } from '@infrastructure/database/prisma.service';

import type { IMovementData } from './createMovementUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';

export interface IGetMovementsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: string;
  type?: string;
  productId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeLines?: boolean; // Optional: include lines in response (default: true)
}

export type IGetMovementsResponse = IPaginatedResponse<IMovementData>;

@Injectable()
export class GetMovementsUseCase {
  private readonly logger = new Logger(GetMovementsUseCase.name);

  constructor(
    @Inject('MovementRepository') private readonly movementRepository: IMovementRepository,
    @Inject('ProductRepository') private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetMovementsRequest
  ): Promise<Result<IGetMovementsResponse, DomainError>> {
    this.logger.log('Getting movements', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      warehouseId: request.warehouseId,
      status: request.status,
      type: request.type,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    // Compose specifications based on filters
    const specifications: IPrismaSpecification<Movement>[] = [];

    if (request.warehouseId) {
      specifications.push(new MovementByWarehouseSpecification(request.warehouseId));
    }

    if (request.status) {
      specifications.push(new MovementByStatusSpecification(request.status));
    }

    if (request.type) {
      specifications.push(
        new MovementByTypeSpecification(
          request.type as 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN'
        )
      );
    }

    if (request.productId) {
      specifications.push(new MovementByProductSpecification(request.productId));
    }

    if (request.startDate && request.endDate) {
      specifications.push(new MovementByDateRangeSpecification(request.startDate, request.endDate));
    }

    // Combine all specifications with AND logic
    let result;
    if (specifications.length > 0) {
      const finalSpec = specifications.reduce<IPrismaSpecification<Movement>>(
        (acc, spec) => acc.and(spec) as IPrismaSpecification<Movement>,
        specifications[0]
      );
      result = await this.movementRepository.findBySpecification(finalSpec, request.orgId, {
        skip,
        take,
      });
    } else {
      // Fallback to findAll for backward compatibility
      const allMovements = await this.movementRepository.findAll(request.orgId);
      const total = allMovements.length;
      const paginatedMovements = allMovements.slice(skip, skip + take);
      result = {
        data: paginatedMovements,
        total,
        hasMore: skip + take < total,
      };
    }

    // Apply sorting (in-memory for now, could be moved to Prisma orderBy)
    let sortedMovements = result.data;
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      sortedMovements = [...result.data].sort((a: Movement, b: Movement) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'type':
            aValue = a.type.getValue();
            bValue = b.type.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'postedAt':
            aValue = a.postedAt?.getTime() || 0;
            bValue = b.postedAt?.getTime() || 0;
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

    // Collect unique product IDs from all movement lines
    const productIds = new Set<string>();
    for (const movement of sortedMovements) {
      for (const line of movement.getLines()) {
        productIds.add(line.productId);
      }
    }

    // Fetch product information for all products in movements
    const productInfoMap = new Map<string, IProductInfo>();
    for (const productId of productIds) {
      try {
        const product = await this.productRepository.findById(productId, request.orgId);
        if (product) {
          productInfoMap.set(productId, {
            sku: product.sku.getValue(),
            name: product.name.getValue(),
            price: product.price?.getAmount(),
            currency: product.price?.getCurrency(),
          });
        }
      } catch (error) {
        // Log error but continue - product info is optional
        this.logger.warn(`Failed to fetch product info for ${productId}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Batch-fetch warehouse names for all movements
    const warehouseIds = [...new Set(sortedMovements.map(m => m.warehouseId))];
    const warehouses = warehouseIds.length
      ? await this.prisma.warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const warehouseMap = new Map(warehouses.map(w => [w.id, { name: w.name, code: w.code }]));

    // Use mapper to convert entities to response DTOs with product information
    return ok({
      success: true,
      message: 'Movements retrieved successfully',
      data: MovementMapper.toResponseDataList(sortedMovements, productInfoMap, warehouseMap),
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
