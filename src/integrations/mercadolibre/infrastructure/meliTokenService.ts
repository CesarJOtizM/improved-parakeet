import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { MeliReauthRequiredError } from '../domain/meliReauthRequired.error.js';
import { IntegrationConnection } from '../../shared/domain/entities/integrationConnection.entity.js';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { MeliTokenResponse } from '../dto/meli-api.types.js';

const MELI_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const REFRESH_TOKEN_LIFETIME_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

@Injectable()
export class MeliTokenService {
  private readonly logger = new Logger(MeliTokenService.name);
  private readonly refreshLocks = new Map<string, Promise<string>>();

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService
  ) {}

  async getValidAccessToken(connection: IntegrationConnection): Promise<string> {
    if (connection.needsReauth) {
      throw new MeliReauthRequiredError(connection.id);
    }

    // Reuse valid access token
    if (!connection.isAccessTokenExpired && connection.encryptedAccessToken) {
      return this.encryptionService.decrypt(connection.encryptedAccessToken);
    }

    // Refresh token expired → need re-auth
    if (connection.isRefreshTokenExpired) {
      connection.markReauthRequired();
      await this.connectionRepository.update(connection);
      throw new MeliReauthRequiredError(connection.id);
    }

    // Access token expired → refresh
    return this.refreshWithLock(connection);
  }

  private async refreshWithLock(connection: IntegrationConnection): Promise<string> {
    const existing = this.refreshLocks.get(connection.id);
    if (existing) {
      this.logger.debug(`Waiting for existing refresh for connection ${connection.id}`);
      return existing;
    }

    const promise = this.doRefresh(connection).finally(() => {
      this.refreshLocks.delete(connection.id);
    });

    this.refreshLocks.set(connection.id, promise);
    return promise;
  }

  private async doRefresh(connection: IntegrationConnection): Promise<string> {
    this.logger.log(`Refreshing MeLi token for connection ${connection.id}`);

    if (!connection.encryptedRefreshToken) {
      connection.markReauthRequired();
      await this.connectionRepository.update(connection);
      throw new MeliReauthRequiredError(connection.id);
    }

    const clientId = this.encryptionService.decrypt(connection.encryptedAppKey);
    const clientSecret = this.encryptionService.decrypt(connection.encryptedAppToken);
    const refreshToken = this.encryptionService.decrypt(connection.encryptedRefreshToken);

    connection.markTokenRefreshing();
    await this.connectionRepository.update(connection);

    try {
      const response = await axios.post<MeliTokenResponse>(MELI_TOKEN_URL, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
        user_id: userId,
      } = response.data;

      const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
      const encryptedRefreshToken = this.encryptionService.encrypt(newRefreshToken);
      const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

      connection.updateOAuthTokens({
        encryptedAccessToken,
        encryptedRefreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        meliUserId: String(userId),
      });
      await this.connectionRepository.update(connection);

      this.logger.log(`MeLi token refreshed for connection ${connection.id}`);
      return access_token;
    } catch (error) {
      this.logger.error(
        `MeLi token refresh failed for connection ${connection.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      connection.markReauthRequired();
      await this.connectionRepository.update(connection);
      throw new MeliReauthRequiredError(connection.id);
    }
  }

  async exchangeAuthCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<MeliTokenResponse> {
    this.logger.log('Exchanging MeLi auth code for tokens');

    const response = await axios.post<MeliTokenResponse>(MELI_TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    return response.data;
  }
}
