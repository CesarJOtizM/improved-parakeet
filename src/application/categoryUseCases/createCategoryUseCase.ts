import { Inject, Injectable, Logger } from '@nestjs/common';
import { Category } from '@product/domain/entities/category.entity';
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

export interface ICreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  orgId: string;
}

export type ICreateCategoryResponse = IApiResponseSuccess<ICategoryData>;

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: ICategoryRepository
  ) {}

  async execute(
    request: ICreateCategoryRequest
  ): Promise<Result<ICreateCategoryResponse, DomainError>> {
    this.logger.log('Creating category', { name: request.name, orgId: request.orgId });

    try {
      // Validate name uniqueness
      const nameExists = await this.categoryRepository.existsByName(request.name, request.orgId);
      if (nameExists) {
        return err(
          new ConflictError('A category with this name already exists', 'CATEGORY_NAME_CONFLICT')
        );
      }

      // Validate parent exists if provided
      let parentName: string | undefined;
      if (request.parentId) {
        const parent = await this.categoryRepository.findById(request.parentId, request.orgId);
        if (!parent) {
          return err(new NotFoundError('Parent category not found'));
        }
        parentName = parent.name;
      }

      const category = Category.create(
        {
          name: request.name,
          description: request.description,
          parentId: request.parentId,
        },
        request.orgId
      );

      const saved = await this.categoryRepository.save(category);

      return ok({
        success: true,
        message: 'Category created successfully',
        data: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          parentId: saved.parentId,
          parentName,
          isActive: saved.isActive,
          productCount: 0,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error creating category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to create category', 'CATEGORY_CREATION_ERROR'));
    }
  }
}
