import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationConnection } from '../../shared/domain/entities/integrationConnection.entity.js';
import { MeliApiClient } from '../infrastructure/meliApiClient.js';
import { MeliSyncOrderUseCase } from './meliSyncOrderUseCase.js';
import { MeliReauthRequiredError } from '../domain/meliReauthRequired.error.js';
import { DomainError, ValidationError, Result, ok, err } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IMeliPollOrdersRequest {
  connectionId?: string;
  orgId?: string;
}

export type IMeliPollOrdersResponse = IApiResponseSuccess<{
  polled: number;
  synced: number;
  failed: number;
}>;

@Injectable()
export class MeliPollOrdersUseCase {
  private readonly logger = new Logger(MeliPollOrdersUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly meliApiClient: MeliApiClient,
    private readonly meliSyncOrderUseCase: MeliSyncOrderUseCase
  ) {}

  async execute(
    request: IMeliPollOrdersRequest
  ): Promise<Result<IMeliPollOrdersResponse, DomainError>> {
    this.logger.log(
      'Polling MeLi orders',
      request.connectionId ? { connectionId: request.connectionId } : 'all connected integrations'
    );

    try {
      let connections: IntegrationConnection[];

      if (request.connectionId && request.orgId) {
        const conn = await this.connectionRepository.findById(request.connectionId, request.orgId);
        connections = conn ? [conn] : [];
      } else {
        const allPolling = await this.connectionRepository.findAllConnectedForPolling();
        connections = allPolling.filter(c => c.provider === 'MERCADOLIBRE');
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
          if (pollError instanceof MeliReauthRequiredError) {
            this.logger.warn(`Connection ${connection.id} requires re-auth, skipping`);
            continue;
          }
          this.logger.error(`Error polling MeLi connection ${connection.id}`, {
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
      this.logger.error('Error during MeLi polling', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MELI_POLL_ERROR'
        )
      );
    }
  }

  private async pollConnection(
    connection: IntegrationConnection
  ): Promise<{ polled: number; synced: number; failed: number }> {
    const dateFrom = connection.lastSyncAt ? connection.lastSyncAt.toISOString() : undefined;

    const response = await this.meliApiClient.listOrders(connection, {
      sort: 'date_desc',
      dateFrom,
      limit: 50,
    });

    let synced = 0;
    let failed = 0;

    for (const order of response.results) {
      const result = await this.meliSyncOrderUseCase.execute({
        connectionId: connection.id,
        externalOrderId: String(order.id),
        orgId: connection.orgId,
      });

      if (result.isOk()) {
        synced++;
      } else {
        failed++;
      }
    }

    return { polled: response.results.length, synced, failed };
  }
}
