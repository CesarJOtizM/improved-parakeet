import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IGetCategoriesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface ICategoryData {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetCategoriesResponse = IPaginatedResponse<ICategoryData>;

@Injectable()
export class GetCategoriesUseCase {
  private readonly logger = new Logger(GetCategoriesUseCase.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: ICategoryRepository,
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IGetCategoriesRequest
  ): Promise<Result<IGetCategoriesResponse, DomainError>> {
    this.logger.log('Getting categories', { orgId: request.orgId });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    let categories = await this.categoryRepository.findAll(request.orgId);

    // Apply filters
    if (request.isActive !== undefined) {
      categories = categories.filter(c => c.isActive === request.isActive);
    }

    if (request.parentId) {
      categories = categories.filter(c => c.parentId === request.parentId);
    }

    if (request.search) {
      const searchLower = request.search.toLowerCase();
      categories = categories.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
      );
    }

    const total = categories.length;
    const paginatedCategories = categories.slice(skip, skip + take);

    // Build parent name map
    const allCategories = await this.categoryRepository.findAll(request.orgId);
    const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));

    // Count products per category (using categoryId FK)
    const allProducts = await this.productRepository.findAll(request.orgId);

    const data: ICategoryData[] = paginatedCategories.map(category => {
      const productCount = allProducts.filter(p =>
        p.categories.some(c => c.id === category.id)
      ).length;

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        parentName: category.parentId ? categoryMap.get(category.parentId) : undefined,
        isActive: category.isActive,
        productCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Categories retrieved successfully',
      data,
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
