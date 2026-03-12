import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISkuMappingData } from './createSkuMappingUseCase.js';
import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSkuMappingRepository } from '../../integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.js';

export interface IGetSkuMappingsRequest {
  connectionId: string;
  orgId: string;
}

export type IGetSkuMappingsResponse = IApiResponseSuccess<ISkuMappingData[]>;

@Injectable()
export class GetSkuMappingsUseCase {
  private readonly logger = new Logger(GetSkuMappingsUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSkuMappingRepository')
    private readonly skuMappingRepository: IIntegrationSkuMappingRepository
  ) {}

  async execute(
    request: IGetSkuMappingsRequest
  ): Promise<Result<IGetSkuMappingsResponse, DomainError>> {
    this.logger.log('Getting SKU mappings', { connectionId: request.connectionId });

    const connection = await this.connectionRepository.findById(
      request.connectionId,
      request.orgId
    );
    if (!connection) {
      return err(
        new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
      );
    }

    const mappings = await this.skuMappingRepository.findByConnectionId(request.connectionId);

    const data: ISkuMappingData[] = mappings.map(m => ({
      id: m.id,
      connectionId: m.connectionId,
      externalSku: m.externalSku,
      productId: m.productId,
      productName: m.productName,
      productSku: m.productSku,
      createdAt: m.createdAt,
    }));

    return ok({
      success: true,
      message: 'SKU mappings retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
