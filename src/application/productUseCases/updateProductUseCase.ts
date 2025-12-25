import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductBusinessRulesService } from '@product/domain/services/productBusinessRules.service';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IProductData } from './createProductUseCase';
import type { IProductProps } from '@product/domain/entities/product.entity';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IMovementRepository as IProductMovementRepository } from '@product/domain/services/productBusinessRules.service';

export interface IUpdateProductRequest {
  productId: string;
  name?: string;
  description?: string;
  unit?: {
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

export type IUpdateProductResponse = IApiResponseSuccess<IProductData>;

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IProductMovementRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: IUpdateProductRequest): Promise<IUpdateProductResponse> {
    this.logger.log('Updating product', { productId: request.productId, orgId: request.orgId });

    try {
      // Find existing product
      const product = await this.productRepository.findById(request.productId, request.orgId);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Build update props
      const updateProps: Partial<IProductProps> = {};

      if (request.name !== undefined) {
        updateProps.name = ProductName.create(request.name);
      }

      if (request.description !== undefined) {
        updateProps.description = request.description;
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

      if (request.status !== undefined) {
        updateProps.status = ProductStatus.create(request.status);
      }

      if (request.costMethod !== undefined) {
        // Validate cost method change using business rules
        const validation = await ProductBusinessRulesService.validateCostMethodChange(
          product.id,
          request.orgId,
          this.movementRepository
        );

        if (!validation.isValid) {
          throw new BadRequestException(validation.errors.join(', '));
        }

        updateProps.costMethod = CostMethod.create(request.costMethod);
      }

      // Update product
      product.update(updateProps);

      // Save product
      const savedProduct = await this.productRepository.save(product);

      // Dispatch domain events
      savedProduct.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedProduct.domainEvents);
      savedProduct.clearEvents();

      this.logger.log('Product updated successfully', {
        productId: savedProduct.id,
        sku: savedProduct.sku.getValue(),
      });

      return {
        success: true,
        message: 'Product updated successfully',
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
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error updating product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: request.productId,
        orgId: request.orgId,
      });

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to update product'
      );
    }
  }
}
