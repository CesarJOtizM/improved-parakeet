import { Inject, Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { MeliTokenService } from '../infrastructure/meliTokenService.js';
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

export interface IMeliExchangeAuthCodeRequest {
  connectionId: string;
  authCode: string;
  redirectUri: string;
  orgId: string;
}

export type IMeliExchangeAuthCodeResponse = IApiResponseSuccess<{
  connectionId: string;
  status: string;
  meliUserId: string;
}>;

const REFRESH_TOKEN_LIFETIME_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

@Injectable()
export class MeliExchangeAuthCodeUseCase {
  private readonly logger = new Logger(MeliExchangeAuthCodeUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly meliTokenService: MeliTokenService
  ) {}

  async execute(
    request: IMeliExchangeAuthCodeRequest
  ): Promise<Result<IMeliExchangeAuthCodeResponse, DomainError>> {
    this.logger.log('Exchanging MeLi auth code', {
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

      if (connection.provider !== 'MERCADOLIBRE') {
        return err(
          new ValidationError('Connection is not a MercadoLibre connection', 'INVALID_PROVIDER')
        );
      }

      const clientId = this.encryptionService.decrypt(connection.encryptedAppKey);
      const clientSecret = this.encryptionService.decrypt(connection.encryptedAppToken);

      const tokenResponse = await this.meliTokenService.exchangeAuthCode(
        clientId,
        clientSecret,
        request.authCode,
        request.redirectUri
      );

      const encryptedAccessToken = this.encryptionService.encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = this.encryptionService.encrypt(tokenResponse.refresh_token);
      const accessTokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);
      const meliUserId = String(tokenResponse.user_id);

      connection.updateOAuthTokens({
        encryptedAccessToken,
        encryptedRefreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        meliUserId,
      });

      await this.connectionRepository.update(connection);

      this.logger.log('MeLi auth code exchanged successfully', {
        connectionId: connection.id,
        meliUserId,
      });

      return ok({
        success: true,
        message: 'MercadoLibre authentication successful',
        data: {
          connectionId: connection.id,
          status: connection.status,
          meliUserId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error exchanging MeLi auth code', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Failed to exchange auth code: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MELI_AUTH_CODE_EXCHANGE_ERROR'
        )
      );
    }
  }
}
