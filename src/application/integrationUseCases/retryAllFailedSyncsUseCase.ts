import { Inject, Injectable, Logger } from '@nestjs/common';
import { VtexSyncOrderUseCase } from '../../integrations/vtex/application/vtexSyncOrderUseCase.js';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSyncLogRepository } from '../../integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.js';

export interface IRetryAllFailedSyncsRequest {
  connectionId: string;
  orgId: string;
}

export type IRetryAllFailedSyncsResponse = IApiResponseSuccess<{
  total: number;
  succeeded: number;
  failed: number;
}>;

@Injectable()
export class RetryAllFailedSyncsUseCase {
  private readonly logger = new Logger(RetryAllFailedSyncsUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository,
    private readonly vtexSyncOrderUseCase: VtexSyncOrderUseCase
  ) {}

  async execute(
    request: IRetryAllFailedSyncsRequest
  ): Promise<Result<IRetryAllFailedSyncsResponse, DomainError>> {
    this.logger.log('Retrying all failed syncs', { connectionId: request.connectionId });

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

    let succeeded = 0;
    let failed = 0;

    for (const log of failedLogs) {
      const result = await this.vtexSyncOrderUseCase.execute({
        connectionId: request.connectionId,
        externalOrderId: log.externalOrderId,
        orgId: request.orgId,
      });

      if (result.isOk()) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return ok({
      success: true,
      message: `Retry completed. Succeeded: ${succeeded}, Failed: ${failed}`,
      data: { total: failedLogs.length, succeeded, failed },
      timestamp: new Date().toISOString(),
    });
  }
}
