import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICategoryData } from './getCategoriesUseCase';
import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IGetCategoryByIdRequest {
  categoryId: string;
  orgId: string;
}

export type IGetCategoryByIdResponse = IApiResponseSuccess<ICategoryData>;

@Injectable()
export class GetCategoryByIdUseCase {
  private readonly logger = new Logger(GetCategoryByIdUseCase.name);

  constructor(
    @Inject('CategoryRepository') private readonly categoryRepository: ICategoryRepository,
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IGetCategoryByIdRequest
  ): Promise<Result<IGetCategoryByIdResponse, DomainError>> {
    this.logger.log('Getting category by ID', {
      categoryId: request.categoryId,
      orgId: request.orgId,
    });

    const category = await this.categoryRepository.findById(request.categoryId, request.orgId);

    if (!category) {
      return err(new NotFoundError('Category not found'));
    }

    // Get parent name
    let parentName: string | undefined;
    if (category.parentId) {
      const parent = await this.categoryRepository.findById(category.parentId, request.orgId);
      parentName = parent?.name;
    }

    // Count products
    const allProducts = await this.productRepository.findAll(request.orgId);
    const productCount = allProducts.filter(p => {
      const productCategory = (p as unknown as { category?: string }).category;
      return productCategory === category.name;
    }).length;

    return ok({
      success: true,
      message: 'Category retrieved successfully',
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        parentName,
        isActive: category.isActive,
        productCount,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
