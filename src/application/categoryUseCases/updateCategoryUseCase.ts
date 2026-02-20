import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICategoryData } from './getCategoriesUseCase';
import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IUpdateCategoryRequest {
  categoryId: string;
  orgId: string;
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export type IUpdateCategoryResponse = IApiResponseSuccess<ICategoryData>;

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: ICategoryRepository,
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IUpdateCategoryRequest
  ): Promise<Result<IUpdateCategoryResponse, DomainError>> {
    this.logger.log('Updating category', { categoryId: request.categoryId, orgId: request.orgId });

    try {
      const category = await this.categoryRepository.findById(request.categoryId, request.orgId);
      if (!category) {
        return err(new NotFoundError('Category not found'));
      }

      // Validate name uniqueness if changing name
      if (request.name && request.name !== category.name) {
        const nameExists = await this.categoryRepository.existsByName(request.name, request.orgId);
        if (nameExists) {
          return err(
            new ConflictError('A category with this name already exists', 'CATEGORY_NAME_CONFLICT')
          );
        }
      }

      // Validate parent exists if changing parentId
      if (request.parentId) {
        if (request.parentId === request.categoryId) {
          return err(new ValidationError('A category cannot be its own parent', 'INVALID_PARENT'));
        }
        const parent = await this.categoryRepository.findById(request.parentId, request.orgId);
        if (!parent) {
          return err(new NotFoundError('Parent category not found'));
        }
      }

      category.update({
        name: request.name,
        description: request.description,
        parentId: request.parentId,
        isActive: request.isActive,
      });

      const saved = await this.categoryRepository.save(category);

      // Get parent name
      let parentName: string | undefined;
      if (saved.parentId) {
        const parent = await this.categoryRepository.findById(saved.parentId, request.orgId);
        parentName = parent?.name;
      }

      // Count products
      const allProducts = await this.productRepository.findAll(request.orgId);
      const productCount = allProducts.filter(p => {
        const productCategory = (p as unknown as { category?: string }).category;
        return productCategory === saved.name;
      }).length;

      return ok({
        success: true,
        message: 'Category updated successfully',
        data: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          parentId: saved.parentId,
          parentName,
          isActive: saved.isActive,
          productCount,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to update category', 'CATEGORY_UPDATE_ERROR'));
    }
  }
}
