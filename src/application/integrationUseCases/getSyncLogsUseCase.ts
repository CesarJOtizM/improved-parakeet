import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSyncLogRepository } from '../../integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.js';

export interface IGetSyncLogsRequest {
  connectionId: string;
  orgId: string;
  page?: number;
  limit?: number;
  action?: string;
}

export interface ISyncLogData {
  id: string;
  connectionId: string;
  externalOrderId: string;
  action: string;
  saleId?: string;
  saleNumber?: string;
  contactId?: string;
  errorMessage?: string;
  processedAt: Date;
}

export type IGetSyncLogsResponse = IApiResponseSuccess<ISyncLogData[]> & {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class GetSyncLogsUseCase {
  private readonly logger = new Logger(GetSyncLogsUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository
  ) {}

  async execute(request: IGetSyncLogsRequest): Promise<Result<IGetSyncLogsResponse, DomainError>> {
    const { connectionId, orgId, page = 1, limit = 20, action } = request;

    this.logger.log('Getting sync logs', { connectionId, page, limit, action });

    const connection = await this.connectionRepository.findById(connectionId, orgId);
    if (!connection) {
      return err(
        new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
      );
    }

    const result = await this.syncLogRepository.findByConnectionId(
      connectionId,
      page,
      limit,
      action ? { action } : undefined
    );

    const data: ISyncLogData[] = result.data.map(log => ({
      id: log.id,
      connectionId: log.connectionId,
      externalOrderId: log.externalOrderId,
      action: log.action,
      saleId: log.saleId,
      saleNumber: log.saleNumber,
      contactId: log.contactId,
      errorMessage: log.errorMessage,
      processedAt: log.processedAt,
    }));

    return ok({
      success: true,
      message: 'Sync logs retrieved successfully',
      data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
