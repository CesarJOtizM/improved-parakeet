import { Inject, Injectable, Logger } from '@nestjs/common';
import { VtexSyncOrderUseCase } from '../../integrations/vtex/application/vtexSyncOrderUseCase.js';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationSyncLogRepository } from '../../integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.js';

export interface IRetrySyncRequest {
  syncLogId: string;
  connectionId: string;
  orgId: string;
}

export type IRetrySyncResponse = IApiResponseSuccess<{
  externalOrderId: string;
  action: string;
  saleId?: string;
}>;

@Injectable()
export class RetrySyncUseCase {
  private readonly logger = new Logger(RetrySyncUseCase.name);

  constructor(
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository,
    private readonly vtexSyncOrderUseCase: VtexSyncOrderUseCase
  ) {}

  async execute(request: IRetrySyncRequest): Promise<Result<IRetrySyncResponse, DomainError>> {
    this.logger.log('Retrying sync', { syncLogId: request.syncLogId });

    try {
      // Find all logs for the connection to locate this specific one
      const { data: logs } = await this.syncLogRepository.findByConnectionId(
        request.connectionId,
        1,
        1000,
        { action: 'FAILED' }
      );

      const log = logs.find(l => l.id === request.syncLogId);
      if (!log) {
        return err(new NotFoundError('Sync log not found', 'SYNC_LOG_NOT_FOUND'));
      }

      const result = await this.vtexSyncOrderUseCase.execute({
        connectionId: request.connectionId,
        externalOrderId: log.externalOrderId,
        orgId: request.orgId,
      });

      if (result.isOk()) {
        const value = result.unwrap();
        return ok({
          success: true,
          message: 'Sync retry successful',
          data: {
            externalOrderId: log.externalOrderId,
            action: value.data.action,
            saleId: value.data.saleId,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return err(result.unwrapErr());
    } catch (error) {
      this.logger.error('Error retrying sync', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SYNC_RETRY_ERROR'
        )
      );
    }
  }
}
