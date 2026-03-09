import { Inject, Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { VtexApiClient } from '../infrastructure/vtexApiClient.js';
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

export interface IVtexTestConnectionRequest {
  connectionId: string;
  orgId: string;
}

export type IVtexTestConnectionResponse = IApiResponseSuccess<{ connected: boolean }>;

@Injectable()
export class VtexTestConnectionUseCase {
  private readonly logger = new Logger(VtexTestConnectionUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly vtexApiClient: VtexApiClient
  ) {}

  async execute(
    request: IVtexTestConnectionRequest
  ): Promise<Result<IVtexTestConnectionResponse, DomainError>> {
    this.logger.log('Testing VTEX connection', {
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

      // Decrypt credentials
      const appKey = this.encryptionService.decrypt(connection.encryptedAppKey);
      const appToken = this.encryptionService.decrypt(connection.encryptedAppToken);

      // Ping VTEX
      const isConnected = await this.vtexApiClient.ping(connection.accountName, appKey, appToken);

      if (isConnected) {
        connection.connect();
      } else {
        connection.markError('VTEX API ping failed');
      }

      await this.connectionRepository.update(connection);

      return ok({
        success: true,
        message: isConnected ? 'VTEX connection test successful' : 'VTEX connection test failed',
        data: { connected: isConnected },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error testing VTEX connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VTEX_TEST_CONNECTION_ERROR'
        )
      );
    }
  }
}
