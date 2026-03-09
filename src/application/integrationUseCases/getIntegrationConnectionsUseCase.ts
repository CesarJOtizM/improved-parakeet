import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, Result, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionData } from './createIntegrationConnectionUseCase.js';
import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IGetIntegrationConnectionsRequest {
  orgId: string;
  provider?: string;
  status?: string;
}

export type IGetIntegrationConnectionsResponse = IApiResponseSuccess<IIntegrationConnectionData[]>;

@Injectable()
export class GetIntegrationConnectionsUseCase {
  private readonly logger = new Logger(GetIntegrationConnectionsUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository
  ) {}

  async execute(
    request: IGetIntegrationConnectionsRequest
  ): Promise<Result<IGetIntegrationConnectionsResponse, DomainError>> {
    this.logger.log('Getting integration connections', { orgId: request.orgId });

    const connections = await this.connectionRepository.findByOrgId(request.orgId, {
      provider: request.provider,
      status: request.status,
    });

    const data: IIntegrationConnectionData[] = connections.map(c => ({
      id: c.id,
      provider: c.provider,
      accountName: c.accountName,
      storeName: c.storeName,
      status: c.status,
      syncStrategy: c.syncStrategy,
      syncDirection: c.syncDirection,
      webhookSecret: c.webhookSecret,
      defaultWarehouseId: c.defaultWarehouseId,
      defaultContactId: c.defaultContactId,
      connectedAt: c.connectedAt,
      lastSyncAt: c.lastSyncAt,
      lastSyncError: c.lastSyncError,
      companyId: c.companyId,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return ok({
      success: true,
      message: 'Integration connections retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
