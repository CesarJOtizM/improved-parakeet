import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IProductData } from './createProductUseCase';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IGetProductByIdRequest {
  productId: string;
  orgId: string;
}

export type IGetProductByIdResponse = IApiResponseSuccess<IProductData>;

@Injectable()
export class GetProductByIdUseCase {
  private readonly logger = new Logger(GetProductByIdUseCase.name);

  constructor(
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IGetProductByIdRequest
  ): Promise<Result<IGetProductByIdResponse, DomainError>> {
    this.logger.log('Getting product by ID', {
      productId: request.productId,
      orgId: request.orgId,
    });

    const product = await this.productRepository.findById(request.productId, request.orgId);

    if (!product) {
      return err(new NotFoundError('Product not found'));
    }

    return ok({
      success: true,
      message: 'Product retrieved successfully',
      data: {
        id: product.id,
        sku: product.sku.getValue(),
        name: product.name.getValue(),
        description: product.description,
        unit: {
          code: product.unit.getValue().code,
          name: product.unit.getValue().name,
          precision: product.unit.getValue().precision,
        },
        barcode: product.barcode,
        brand: product.brand,
        model: product.model,
        status: product.status.getValue(),
        costMethod: product.costMethod.getValue(),
        orgId: product.orgId!,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
