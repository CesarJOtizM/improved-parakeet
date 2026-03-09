import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationConnection } from '../../shared/domain/entities/integrationConnection.entity.js';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { VtexApiClient } from '../infrastructure/vtexApiClient.js';
import { VtexSyncOrderUseCase } from './vtexSyncOrderUseCase.js';
import { DomainError, ValidationError, Result, ok, err } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IVtexPollOrdersRequest {
  connectionId?: string;
  orgId?: string;
}

export type IVtexPollOrdersResponse = IApiResponseSuccess<{
  polled: number;
  synced: number;
  failed: number;
}>;

@Injectable()
export class VtexPollOrdersUseCase {
  private readonly logger = new Logger(VtexPollOrdersUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly vtexApiClient: VtexApiClient,
    private readonly vtexSyncOrderUseCase: VtexSyncOrderUseCase
  ) {}

  async execute(
    request: IVtexPollOrdersRequest
  ): Promise<Result<IVtexPollOrdersResponse, DomainError>> {
    this.logger.log('Polling VTEX orders', { connectionId: request.connectionId });

    try {
      let connections: IntegrationConnection[];

      if (request.connectionId && request.orgId) {
        const conn = await this.connectionRepository.findById(request.connectionId, request.orgId);
        connections = conn ? [conn] : [];
      } else {
        connections = await this.connectionRepository.findAllConnectedForPolling();
      }

      let totalPolled = 0;
      let totalSynced = 0;
      let totalFailed = 0;

      for (const connection of connections) {
        try {
          const result = await this.pollConnection(connection);
          totalPolled += result.polled;
          totalSynced += result.synced;
          totalFailed += result.failed;
        } catch (pollError) {
          this.logger.error(`Error polling connection ${connection.id}`, {
            error: pollError instanceof Error ? pollError.message : 'Unknown error',
          });
          connection.markError(
            pollError instanceof Error ? pollError.message : 'Unknown polling error'
          );
          await this.connectionRepository.update(connection);
        }
      }

      return ok({
        success: true,
        message: `Polling completed. Polled: ${totalPolled}, Synced: ${totalSynced}, Failed: ${totalFailed}`,
        data: { polled: totalPolled, synced: totalSynced, failed: totalFailed },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error during VTEX polling', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VTEX_POLL_ERROR'
        )
      );
    }
  }

  private async pollConnection(
    connection: IntegrationConnection
  ): Promise<{ polled: number; synced: number; failed: number }> {
    const appKey = this.encryptionService.decrypt(connection.encryptedAppKey);
    const appToken = this.encryptionService.decrypt(connection.encryptedAppToken);

    // Build date filter from lastSyncAt
    let creationDate: string | undefined;
    if (connection.lastSyncAt) {
      const from = connection.lastSyncAt.toISOString();
      const to = new Date().toISOString();
      creationDate = `creationDate:[${from} TO ${to}]`;
    }

    const response = await this.vtexApiClient.listOrders(connection.accountName, appKey, appToken, {
      creationDate,
      orderBy: 'creationDate,asc',
      perPage: 50,
    });

    let synced = 0;
    let failed = 0;

    for (const orderSummary of response.list) {
      const result = await this.vtexSyncOrderUseCase.execute({
        connectionId: connection.id,
        externalOrderId: orderSummary.orderId,
        orgId: connection.orgId,
      });

      if (result.isOk()) {
        synced++;
      } else {
        failed++;
      }
    }

    return { polled: response.list.length, synced, failed };
  }
}
