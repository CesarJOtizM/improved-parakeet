import { IntegrationSyncLog } from '../entities/integrationSyncLog.entity.js';

export interface IIntegrationSyncLogRepository {
  save(log: IntegrationSyncLog): Promise<IntegrationSyncLog>;
  findByExternalOrderId(
    connectionId: string,
    externalOrderId: string
  ): Promise<IntegrationSyncLog | null>;
  findByConnectionId(
    connectionId: string,
    page: number,
    limit: number,
    filters?: { action?: string }
  ): Promise<{ data: IntegrationSyncLog[]; total: number }>;
  findFailedByConnectionId(connectionId: string): Promise<IntegrationSyncLog[]>;
  update(log: IntegrationSyncLog): Promise<IntegrationSyncLog>;
}
