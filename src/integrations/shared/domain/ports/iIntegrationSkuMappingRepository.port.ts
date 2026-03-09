import { IntegrationSkuMapping } from '../entities/integrationSkuMapping.entity.js';

export interface IIntegrationSkuMappingRepository {
  findByConnectionId(connectionId: string): Promise<IntegrationSkuMapping[]>;
  findByExternalSku(
    connectionId: string,
    externalSku: string
  ): Promise<IntegrationSkuMapping | null>;
  save(mapping: IntegrationSkuMapping): Promise<IntegrationSkuMapping>;
  delete(id: string): Promise<void>;
}
