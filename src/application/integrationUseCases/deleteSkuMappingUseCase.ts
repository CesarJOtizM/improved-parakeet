import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationSkuMappingRepository } from '../../integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.js';

export interface IDeleteSkuMappingRequest {
  mappingId: string;
  connectionId: string;
  orgId: string;
}

export type IDeleteSkuMappingResponse = IApiResponseSuccess<{ id: string }>;

@Injectable()
export class DeleteSkuMappingUseCase {
  private readonly logger = new Logger(DeleteSkuMappingUseCase.name);

  constructor(
    @Inject('IntegrationSkuMappingRepository')
    private readonly skuMappingRepository: IIntegrationSkuMappingRepository
  ) {}

  async execute(
    request: IDeleteSkuMappingRequest
  ): Promise<Result<IDeleteSkuMappingResponse, DomainError>> {
    this.logger.log('Deleting SKU mapping', { mappingId: request.mappingId });

    try {
      // Verify the mapping exists by checking all mappings for this connection
      const mappings = await this.skuMappingRepository.findByConnectionId(request.connectionId);
      const mapping = mappings.find(m => m.id === request.mappingId);

      if (!mapping) {
        return err(new NotFoundError('SKU mapping not found', 'SKU_MAPPING_NOT_FOUND'));
      }

      await this.skuMappingRepository.delete(request.mappingId);

      return ok({
        success: true,
        message: 'SKU mapping deleted successfully',
        data: { id: request.mappingId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error deleting SKU mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
