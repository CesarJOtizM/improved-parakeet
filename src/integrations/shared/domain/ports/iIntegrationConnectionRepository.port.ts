import { IntegrationConnection } from '../entities/integrationConnection.entity.js';

export interface IIntegrationConnectionRepository {
  findByOrgId(
    orgId: string,
    filters?: { provider?: string; status?: string }
  ): Promise<IntegrationConnection[]>;
  findById(id: string, orgId: string): Promise<IntegrationConnection | null>;
  findByProviderAndAccount(
    provider: string,
    accountName: string,
    orgId: string
  ): Promise<IntegrationConnection | null>;
  findByProviderAndAccountGlobal(
    provider: string,
    accountName: string
  ): Promise<IntegrationConnection | null>;
  findAllConnectedForPolling(): Promise<IntegrationConnection[]>;
  save(connection: IntegrationConnection): Promise<IntegrationConnection>;
  update(connection: IntegrationConnection): Promise<IntegrationConnection>;
  delete(id: string, orgId: string): Promise<void>;
}
