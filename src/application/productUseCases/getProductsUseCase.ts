import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ProductByStatusSpecification,
  ProductByCategoriesSpecification,
} from '@product/domain/specifications';
import { ProductMapper } from '@product/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IProductData } from './createProductUseCase';
import type { Product } from '@product/domain/entities/product.entity';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';

export interface IGetProductsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  status?: string;
  categoryIds?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetProductsResponse = IPaginatedResponse<IProductData>;

@Injectable()
export class GetProductsUseCase {
  private readonly logger = new Logger(GetProductsUseCase.name);

  constructor(
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(request: IGetProductsRequest): Promise<Result<IGetProductsResponse, DomainError>> {
    this.logger.log('Getting products', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      status: request.status,
      search: request.search,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    // Compose specifications based on filters
    const specifications: IPrismaSpecification<Product>[] = [];

    if (request.status) {
      const statusSpec = new ProductByStatusSpecification(
        request.status as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
      );
      specifications.push(statusSpec);
    }

    if (request.categoryIds?.length) {
      specifications.push(new ProductByCategoriesSpecification(request.categoryIds));
    }

    // Combine all specifications with AND logic
    let finalSpec: IPrismaSpecification<Product> | undefined;
    if (specifications.length > 0) {
      finalSpec = specifications.reduce<IPrismaSpecification<Product>>(
        (acc, spec) => acc.and(spec) as IPrismaSpecification<Product>,
        specifications[0]
      );
    }

    // For now, if no specifications, we'll use findAll
    // In a future improvement, we could create an AlwaysTrueSpecification
    let result;
    if (finalSpec) {
      result = await this.productRepository.findBySpecification(
        finalSpec as IPrismaSpecification<Product>,
        request.orgId,
        { skip, take }
      );
    } else {
      // Fallback to findAll for backward compatibility
      const allProducts = await this.productRepository.findAll(request.orgId);
      const total = allProducts.length;
      const paginatedProducts = allProducts.slice(skip, skip + take);

      // Apply search filter if provided (in-memory filter for now)
      let filteredProducts = paginatedProducts;
      if (request.search) {
        const searchLower = request.search.toLowerCase();
        filteredProducts = paginatedProducts.filter(
          product =>
            product.name.getValue().toLowerCase().includes(searchLower) ||
            product.sku.getValue().toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower)
        );
      }

      result = {
        data: filteredProducts,
        total,
        hasMore: skip + take < total,
      };
    }

    // Apply sorting (in-memory for now, could be moved to Prisma orderBy)
    let sortedProducts = result.data;
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      sortedProducts = [...result.data].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name.getValue();
            bValue = b.name.getValue();
            break;
          case 'sku':
            aValue = a.sku.getValue();
            bValue = b.sku.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'price':
            aValue = a.price?.getAmount() || 0;
            bValue = b.price?.getAmount() || 0;
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'updatedAt':
            aValue = a.updatedAt.getTime();
            bValue = b.updatedAt.getTime();
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
      message: 'Products retrieved successfully',
      data: ProductMapper.toResponseDataList(sortedProducts),
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
