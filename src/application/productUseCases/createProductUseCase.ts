import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { ProductBusinessRulesService } from '@product/domain/services/productBusinessRules.service';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface ICreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  unit: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  costMethod?: 'AVG' | 'FIFO';
  orgId: string;
}

export interface IProductData {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  status: string;
  costMethod: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateProductResponse = IApiResponseSuccess<IProductData>;

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: ICreateProductRequest): Promise<ICreateProductResponse> {
    this.logger.log('Creating product', { sku: request.sku, orgId: request.orgId });

    try {
      // Create value objects
      const sku = SKU.create(request.sku);
      const name = ProductName.create(request.name);
      const unit = UnitValueObject.create(
        request.unit.code,
        request.unit.name,
        request.unit.precision
      );
      const status = ProductStatus.create(request.status || 'ACTIVE');
      const costMethod = CostMethod.create(request.costMethod || 'AVG');

      // Validate SKU uniqueness using business rules
      await ProductBusinessRulesService.validateSkuUniquenessOrThrow(
        sku,
        request.orgId,
        this.productRepository
      );

      // Create product entity
      const product = Product.create(
        {
          sku,
          name,
          description: request.description,
          unit,
          barcode: request.barcode,
          brand: request.brand,
          model: request.model,
          status,
          costMethod,
        },
        request.orgId
      );

      // Save product
      const savedProduct = await this.productRepository.save(product);

      // Dispatch domain events
      savedProduct.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedProduct.domainEvents);
      savedProduct.clearEvents();

      this.logger.log('Product created successfully', {
        productId: savedProduct.id,
        sku: savedProduct.sku.getValue(),
      });

      return {
        success: true,
        message: 'Product created successfully',
        data: {
          id: savedProduct.id,
          sku: savedProduct.sku.getValue(),
          name: savedProduct.name.getValue(),
          description: savedProduct.description,
          unit: {
            code: savedProduct.unit.getValue().code,
            name: savedProduct.unit.getValue().name,
            precision: savedProduct.unit.getValue().precision,
          },
          barcode: savedProduct.barcode,
          brand: savedProduct.brand,
          model: savedProduct.model,
          status: savedProduct.status.getValue(),
          costMethod: savedProduct.costMethod.getValue(),
          orgId: savedProduct.orgId!,
          createdAt: savedProduct.createdAt,
          updatedAt: savedProduct.updatedAt,
        } as IProductData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error creating product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sku: request.sku,
        orgId: request.orgId,
      });

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create product'
      );
    }
  }
}
