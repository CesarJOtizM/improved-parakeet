import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSyncLogRepository } from '../../integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.js';

export interface IGetUnmatchedSkusRequest {
  connectionId: string;
  orgId: string;
}

export interface IUnmatchedSkuData {
  id: string;
  externalOrderId: string;
  errorMessage?: string;
  processedAt: Date;
}

export type IGetUnmatchedSkusResponse = IApiResponseSuccess<IUnmatchedSkuData[]>;

@Injectable()
export class GetUnmatchedSkusUseCase {
  private readonly logger = new Logger(GetUnmatchedSkusUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository
  ) {}

  async execute(
    request: IGetUnmatchedSkusRequest
  ): Promise<Result<IGetUnmatchedSkusResponse, DomainError>> {
    this.logger.log('Getting unmatched SKUs', { connectionId: request.connectionId });

    const connection = await this.connectionRepository.findById(
      request.connectionId,
      request.orgId
    );
    if (!connection) {
      return err(
        new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
      );
    }

    const failedLogs = await this.syncLogRepository.findFailedByConnectionId(request.connectionId);

    const data: IUnmatchedSkuData[] = failedLogs.map(log => ({
      id: log.id,
      externalOrderId: log.externalOrderId,
      errorMessage: log.errorMessage,
      processedAt: log.processedAt,
    }));

    return ok({
      success: true,
      message: 'Unmatched SKUs retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
