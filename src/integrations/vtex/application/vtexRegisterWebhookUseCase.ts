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

export interface IVtexRegisterWebhookRequest {
  connectionId: string;
  webhookBaseUrl: string;
  orgId: string;
}

export type IVtexRegisterWebhookResponse = IApiResponseSuccess<{ registered: boolean }>;

@Injectable()
export class VtexRegisterWebhookUseCase {
  private readonly logger = new Logger(VtexRegisterWebhookUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly vtexApiClient: VtexApiClient
  ) {}

  async execute(
    request: IVtexRegisterWebhookRequest
  ): Promise<Result<IVtexRegisterWebhookResponse, DomainError>> {
    this.logger.log('Registering VTEX webhook', {
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

      const appKey = this.encryptionService.decrypt(connection.encryptedAppKey);
      const appToken = this.encryptionService.decrypt(connection.encryptedAppToken);

      const hookUrl = `${request.webhookBaseUrl}/vtex/webhook/${connection.accountName}?secret=${connection.webhookSecret}`;

      await this.vtexApiClient.registerWebhook(connection.accountName, appKey, appToken, hookUrl);

      return ok({
        success: true,
        message: 'VTEX webhook registered successfully',
        data: { registered: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error registering VTEX webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Failed to register webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VTEX_WEBHOOK_REGISTRATION_ERROR'
        )
      );
    }
  }
}
