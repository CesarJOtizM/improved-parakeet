import { Inject, Injectable, Logger } from '@nestjs/common';
import { MeliApiClient } from '../infrastructure/meliApiClient.js';
import { MeliReauthRequiredError } from '../domain/meliReauthRequired.error.js';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IMeliTestConnectionRequest {
  connectionId: string;
  orgId: string;
}

export type IMeliTestConnectionResponse = IApiResponseSuccess<{
  connected: boolean;
  needsReauth?: boolean;
}>;

@Injectable()
export class MeliTestConnectionUseCase {
  private readonly logger = new Logger(MeliTestConnectionUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly meliApiClient: MeliApiClient
  ) {}

  async execute(
    request: IMeliTestConnectionRequest
  ): Promise<Result<IMeliTestConnectionResponse, DomainError>> {
    this.logger.log('Testing MeLi connection', {
      connectionId: request.connectionId,
      orgId: request.orgId,
    });

    try {
      const connection = await this.connectionRepository.findById(
        request.connectionId,
        request.orgId
      );
      if (!connection) {
        return err(
          new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
        );
      }

      try {
        const isConnected = await this.meliApiClient.ping(connection);

        if (isConnected) {
          connection.connect();
        } else {
          connection.markError('MercadoLibre API ping failed');
        }

        await this.connectionRepository.update(connection);

        return ok({
          success: true,
          message: isConnected
            ? 'MercadoLibre connection test successful'
            : 'MercadoLibre connection test failed',
          data: { connected: isConnected },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof MeliReauthRequiredError) {
          return ok({
            success: true,
            message: 'MercadoLibre requires re-authentication',
            data: { connected: false, needsReauth: true },
            timestamp: new Date().toISOString(),
          });
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error testing MeLi connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MELI_TEST_CONNECTION_ERROR'
        )
      );
    }
  }
}
