import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationSkuMapping } from '../../integrations/shared/domain/entities/integrationSkuMapping.entity.js';
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

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSkuMappingRepository } from '../../integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.js';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface ICreateSkuMappingRequest {
  connectionId: string;
  externalSku: string;
  productId: string;
  orgId: string;
}

export interface ISkuMappingData {
  id: string;
  connectionId: string;
  externalSku: string;
  productId: string;
  productName?: string;
  productSku?: string;
  createdAt: Date;
}

export type ICreateSkuMappingResponse = IApiResponseSuccess<ISkuMappingData>;

@Injectable()
export class CreateSkuMappingUseCase {
  private readonly logger = new Logger(CreateSkuMappingUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSkuMappingRepository')
    private readonly skuMappingRepository: IIntegrationSkuMappingRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: ICreateSkuMappingRequest
  ): Promise<Result<ICreateSkuMappingResponse, DomainError>> {
    this.logger.log('Creating SKU mapping', {
      connectionId: request.connectionId,
      externalSku: request.externalSku,
    });

    try {
      // Validate connection exists
      const connection = await this.connectionRepository.findById(
        request.connectionId,
        request.orgId
      );
      if (!connection) {
        return err(
          new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
        );
      }

      // Validate product exists
      const product = await this.productRepository.findById(request.productId, request.orgId);
      if (!product) {
        return err(new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND'));
      }

      // Check for duplicate
      const existing = await this.skuMappingRepository.findByExternalSku(
        request.connectionId,
        request.externalSku
      );
      if (existing) {
        return err(
          new ConflictError(
            'A mapping for this external SKU already exists',
            'SKU_MAPPING_CONFLICT'
          )
        );
      }

      const mapping = IntegrationSkuMapping.create(
        {
          connectionId: request.connectionId,
          externalSku: request.externalSku,
          productId: request.productId,
        },
        request.orgId
      );

      const saved = await this.skuMappingRepository.save(mapping);

      return ok({
        success: true,
        message: 'SKU mapping created successfully',
        data: {
          id: saved.id,
          connectionId: saved.connectionId,
          externalSku: saved.externalSku,
          productId: saved.productId,
          productName: product.name.getValue(),
          productSku: product.sku.getValue(),
          createdAt: saved.createdAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error creating SKU mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Failed to create SKU mapping: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SKU_MAPPING_CREATION_ERROR'
        )
      );
    }
  }
}
