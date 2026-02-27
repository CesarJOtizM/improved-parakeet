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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

    // Build product count map once
    const productCountMap = new Map<string, number>();
    for (const category of paginatedCategories) {
      productCountMap.set(
        category.id,
        allProducts.filter(p => p.categories.some(c => c.id === category.id)).length
      );
    }

    const data: ICategoryData[] = paginatedCategories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      parentName: category.parentId ? categoryMap.get(category.parentId) : undefined,
      isActive: category.isActive,
      productCount: productCountMap.get(category.id) || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      data.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'isActive':
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          case 'productCount':
            aValue = a.productCount;
            bValue = b.productCount;
            break;
          case 'updatedAt':
            aValue = a.updatedAt.getTime();
            bValue = b.updatedAt.getTime();
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

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
