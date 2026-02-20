import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IDeleteCategoryRequest {
  categoryId: string;
  orgId: string;
}

export type IDeleteCategoryResponse = IApiResponseSuccess<{ id: string }>;

@Injectable()
export class DeleteCategoryUseCase {
  private readonly logger = new Logger(DeleteCategoryUseCase.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: ICategoryRepository,
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IDeleteCategoryRequest
  ): Promise<Result<IDeleteCategoryResponse, DomainError>> {
    this.logger.log('Deleting category', { categoryId: request.categoryId, orgId: request.orgId });

    try {
      const category = await this.categoryRepository.findById(request.categoryId, request.orgId);
      if (!category) {
        return err(new NotFoundError('Category not found'));
      }

      // Check for subcategories
      const children = await this.categoryRepository.findByParentId(
        request.categoryId,
        request.orgId
      );
      if (children.length > 0) {
        return err(
          new BusinessRuleError(
            'Cannot delete a category that has subcategories. Remove subcategories first.',
            'CATEGORY_HAS_CHILDREN'
          )
        );
      }

      // Check for associated products
      const allProducts = await this.productRepository.findAll(request.orgId);
      const associatedProducts = allProducts.filter(p => {
        const productCategory = (p as unknown as { category?: string }).category;
        return productCategory === category.name;
      });

      if (associatedProducts.length > 0) {
        return err(
          new BusinessRuleError(
            `Cannot delete category with ${associatedProducts.length} associated products. Reassign products first.`,
            'CATEGORY_HAS_PRODUCTS'
          )
        );
      }

      await this.categoryRepository.delete(request.categoryId, request.orgId);

      return ok({
        success: true,
        message: 'Category deleted successfully',
        data: { id: request.categoryId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error deleting category', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to delete category', 'CATEGORY_DELETE_ERROR'));
    }
  }
}
