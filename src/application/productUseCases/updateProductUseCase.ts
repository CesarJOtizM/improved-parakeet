import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductBusinessRulesService } from '@product/domain/services/productBusinessRules.service';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { Price } from '@product/domain/valueObjects/price.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
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

import type { IProductData } from './createProductUseCase';
import type { IProductProps } from '@product/domain/entities/product.entity';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IMovementRepository as IProductMovementRepository } from '@product/domain/services/productBusinessRules.service';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IUpdateProductRequest {
  productId: string;
  name?: string;
  description?: string;
  categoryIds?: string[];
  unit?: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  price?: number;
  currency?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  costMethod?: 'AVG' | 'FIFO';
  orgId: string;
}

export type IUpdateProductResponse = IApiResponseSuccess<IProductData>;

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IProductMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IUpdateProductRequest
  ): Promise<Result<IUpdateProductResponse, DomainError>> {
    this.logger.log('Updating product', { productId: request.productId, orgId: request.orgId });

    try {
      // Find existing product
      const product = await this.productRepository.findById(request.productId, request.orgId);

      if (!product) {
        return err(
          new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND', {
            productId: request.productId,
            orgId: request.orgId,
          })
        );
      }

      // Build update props
      const updateProps: Partial<IProductProps> = {};

      if (request.name !== undefined) {
        const nameResult = ProductName.create(request.name);
        if (nameResult.isErr()) {
          return err(nameResult.unwrapErr());
        }
        updateProps.name = nameResult.unwrap();
      }

      if (request.description !== undefined) {
        updateProps.description = request.description;
      }

      if (request.categoryIds !== undefined) {
        updateProps.categories = request.categoryIds.map(id => ({ id, name: '' }));
      }

      if (request.unit !== undefined) {
        updateProps.unit = UnitValueObject.create(
          request.unit.code,
          request.unit.name,
          request.unit.precision
        );
      }

      if (request.barcode !== undefined) {
        updateProps.barcode = request.barcode;
      }

      if (request.brand !== undefined) {
        updateProps.brand = request.brand;
      }

      if (request.model !== undefined) {
        updateProps.model = request.model;
      }

      if (request.price !== undefined) {
        const currency = request.currency || 'COP';
        const precision = 2; // Default precision for price
        updateProps.price = Price.create(request.price, currency, precision);
      }

      if (request.status !== undefined) {
        // Use aggregate method to check if status can be changed
        if (!product.canChangeStatus(request.status)) {
          return err(
            new BusinessRuleError(
              'Cannot change status of a discontinued product',
              'STATUS_CHANGE_ERROR',
              {
                productId: product.id,
                orgId: request.orgId,
              }
            )
          );
        }
        updateProps.status = ProductStatus.create(request.status);
      }

      if (request.costMethod !== undefined) {
        // Check if cost method can be changed (pure check)
        if (!product.canChangeCostMethod()) {
          return err(
            new BusinessRuleError('Cost method cannot be changed', 'COST_METHOD_CHANGE_ERROR', {
              productId: product.id,
              orgId: request.orgId,
            })
          );
        }

        // Validate cost method change using business rules (async check)
        const validation = await ProductBusinessRulesService.validateCostMethodChange(
          product.id,
          request.orgId,
          this.movementRepository
        );

        if (!validation.isValid) {
          return err(
            new BusinessRuleError(validation.errors.join(', '), 'COST_METHOD_CHANGE_ERROR', {
              productId: product.id,
              orgId: request.orgId,
            })
          );
        }

        updateProps.costMethod = CostMethod.create(request.costMethod);
      }

      // Update product (returns new instance)
      const updatedProduct = product.update(updateProps);

      // Save product
      const savedProduct = await this.productRepository.save(updatedProduct);

      // Dispatch domain events
      savedProduct.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedProduct.domainEvents);
      savedProduct.clearEvents();

      this.logger.log('Product updated successfully', {
        productId: savedProduct.id,
        sku: savedProduct.sku.getValue(),
      });

      const response: IUpdateProductResponse = {
        success: true,
        message: 'Product updated successfully',
        data: {
          id: savedProduct.id,
          sku: savedProduct.sku.getValue(),
          name: savedProduct.name.getValue(),
          description: savedProduct.description,
          categories: savedProduct.categories,
          unit: {
            code: savedProduct.unit.getValue().code,
            name: savedProduct.unit.getValue().name,
            precision: savedProduct.unit.getValue().precision,
          },
          barcode: savedProduct.barcode,
          brand: savedProduct.brand,
          model: savedProduct.model,
          price: savedProduct.price?.getAmount(),
          currency: savedProduct.price?.getCurrency(),
          status: savedProduct.status.getValue(),
          costMethod: savedProduct.costMethod.getValue(),
          orgId: savedProduct.orgId!,
          createdAt: savedProduct.createdAt,
          updatedAt: savedProduct.updatedAt,
        } as IProductData,
        timestamp: new Date().toISOString(),
      };

      return ok(response);
    } catch (error) {
      this.logger.error('Error updating product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: request.productId,
        orgId: request.orgId,
      });

      if (error instanceof Error) {
        return err(new ValidationError(error.message, 'PRODUCT_UPDATE_ERROR'));
      }

      return err(new ValidationError('Failed to update product', 'PRODUCT_UPDATE_ERROR'));
    }
  }
}
