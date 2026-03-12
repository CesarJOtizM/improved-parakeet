import { MeliTokenService } from '../../../src/integrations/mercadolibre/infrastructure/meliTokenService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { MeliReauthRequiredError } from '../../../src/integrations/mercadolibre/domain/meliReauthRequired.error';
import axios from 'axios';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MeliTokenService', () => {
  const mockOrgId = 'test-org-id';

  let service: MeliTokenService;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;

  const createMockConnection = (
    overrides: Partial<{
      encryptedAccessToken: string;
      encryptedRefreshToken: string;
      accessTokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
      tokenStatus: string;
      meliUserId: string;
    }> = {}
  ) =>
    IntegrationConnection.reconstitute(
      {
        provider: 'MERCADOLIBRE',
        accountName: 'testaccount',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'POLLING',
        syncDirection: 'INBOUND',
        encryptedAppKey: 'encrypted-client-id',
        encryptedAppToken: 'encrypted-client-secret',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
        encryptedAccessToken: overrides.encryptedAccessToken ?? 'encrypted-access-token',
        encryptedRefreshToken: overrides.encryptedRefreshToken ?? 'encrypted-refresh-token',
        accessTokenExpiresAt: overrides.accessTokenExpiresAt ?? new Date(Date.now() + 3600000),
        refreshTokenExpiresAt:
          overrides.refreshTokenExpiresAt ?? new Date(Date.now() + 15552000000),
        tokenStatus: overrides.tokenStatus ?? 'VALID',
        meliUserId: overrides.meliUserId ?? '12345',
      },
      'conn-1',
      mockOrgId
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnectionRepository = {
      findByOrgId: jest.fn(),
      findById: jest.fn(),
      findByProviderAndAccount: jest.fn(),
      findByProviderAndAccountGlobal: jest.fn(),
      findAllConnectedForPolling: jest.fn(),
      findByMeliUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationConnectionRepository>;

    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<EncryptionService>;

    service = new MeliTokenService(mockConnectionRepository, mockEncryptionService);
  });

  describe('getValidAccessToken', () => {
    it('Given: valid non-expired access token When: getting token Then: should return decrypted token', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });
      mockEncryptionService.decrypt.mockReturnValue('plain-access-token');

      const result = await service.getValidAccessToken(connection);

      expect(result).toBe('plain-access-token');
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted-access-token');
    });

    it('Given: connection needs reauth When: getting token Then: should throw MeliReauthRequiredError', async () => {
      const connection = createMockConnection({
        tokenStatus: 'REAUTH_REQUIRED',
      });

      await expect(service.getValidAccessToken(connection)).rejects.toThrow(
        MeliReauthRequiredError
      );
    });

    it('Given: access token expired but refresh token valid When: getting token Then: should refresh token', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() - 60000), // expired 1 min ago
        refreshTokenExpiresAt: new Date(Date.now() + 15552000000), // valid
      });
      mockEncryptionService.decrypt
        .mockReturnValueOnce('plain-client-id')
        .mockReturnValueOnce('plain-client-secret')
        .mockReturnValueOnce('plain-refresh-token');
      mockEncryptionService.encrypt
        .mockReturnValueOnce('new-encrypted-access')
        .mockReturnValueOnce('new-encrypted-refresh');
      mockConnectionRepository.update.mockImplementation(async c => c);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 21600,
          scope: 'read write',
          user_id: 12345,
          token_type: 'bearer',
        },
      });

      const result = await service.getValidAccessToken(connection);

      expect(result).toBe('new-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.mercadolibre.com/oauth/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          client_id: 'plain-client-id',
          client_secret: 'plain-client-secret',
          refresh_token: 'plain-refresh-token',
        })
      );
      expect(mockConnectionRepository.update).toHaveBeenCalled();
    });

    it('Given: both access and refresh tokens expired When: getting token Then: should mark REAUTH_REQUIRED', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() - 60000),
        refreshTokenExpiresAt: new Date(Date.now() - 60000), // also expired
      });
      mockConnectionRepository.update.mockImplementation(async c => c);

      await expect(service.getValidAccessToken(connection)).rejects.toThrow(
        MeliReauthRequiredError
      );
      expect(mockConnectionRepository.update).toHaveBeenCalled();
    });
  });

  describe('refreshWithLock', () => {
    it('Given: concurrent refresh calls for same connection When: refreshing Then: only one refresh runs at a time', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() - 60000),
        refreshTokenExpiresAt: new Date(Date.now() + 15552000000),
      });
      mockEncryptionService.decrypt
        .mockReturnValueOnce('plain-client-id')
        .mockReturnValueOnce('plain-client-secret')
        .mockReturnValueOnce('plain-refresh-token');
      mockEncryptionService.encrypt
        .mockReturnValueOnce('new-encrypted-access')
        .mockReturnValueOnce('new-encrypted-refresh');
      mockConnectionRepository.update.mockImplementation(async c => c);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 21600,
          scope: 'read write',
          user_id: 12345,
          token_type: 'bearer',
        },
      });

      // Make two concurrent calls
      const [result1, result2] = await Promise.all([
        service.getValidAccessToken(connection),
        service.getValidAccessToken(connection),
      ]);

      expect(result1).toBe('new-access-token');
      expect(result2).toBe('new-access-token');
      // axios.post should only have been called once due to lock
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('doRefresh', () => {
    it('Given: valid refresh token When: refreshing Then: should call OAuth token endpoint with refresh_token grant', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() - 60000),
        refreshTokenExpiresAt: new Date(Date.now() + 15552000000),
      });
      mockEncryptionService.decrypt
        .mockReturnValueOnce('client-id-123')
        .mockReturnValueOnce('client-secret-456')
        .mockReturnValueOnce('refresh-tok-789');
      mockEncryptionService.encrypt
        .mockReturnValueOnce('enc-new-access')
        .mockReturnValueOnce('enc-new-refresh');
      mockConnectionRepository.update.mockImplementation(async c => c);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'fresh-access-token',
          refresh_token: 'fresh-refresh-token',
          expires_in: 21600,
          scope: 'read write',
          user_id: 99999,
          token_type: 'bearer',
        },
      });

      const result = await service.getValidAccessToken(connection);

      expect(result).toBe('fresh-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: 'client-id-123',
        client_secret: 'client-secret-456',
        refresh_token: 'refresh-tok-789',
      });
    });

    it('Given: API failure during refresh When: refreshing Then: should mark REAUTH_REQUIRED', async () => {
      const connection = createMockConnection({
        accessTokenExpiresAt: new Date(Date.now() - 60000),
        refreshTokenExpiresAt: new Date(Date.now() + 15552000000),
      });
      mockEncryptionService.decrypt
        .mockReturnValueOnce('client-id')
        .mockReturnValueOnce('client-secret')
        .mockReturnValueOnce('refresh-token');
      mockConnectionRepository.update.mockImplementation(async c => c);

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(service.getValidAccessToken(connection)).rejects.toThrow(
        MeliReauthRequiredError
      );
      // Should have been called: markTokenRefreshing update, then markReauthRequired update
      expect(mockConnectionRepository.update).toHaveBeenCalled();
    });
  });

  describe('exchangeAuthCode', () => {
    it('Given: valid auth code When: exchanging Then: should call OAuth token endpoint with authorization_code grant', async () => {
      const tokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 21600,
        scope: 'read write',
        user_id: 54321,
        token_type: 'bearer',
      };
      mockedAxios.post.mockResolvedValue({ data: tokenResponse });

      const result = await service.exchangeAuthCode(
        'app-client-id',
        'app-client-secret',
        'AUTH-CODE-123',
        'https://myapp.com/callback'
      );

      expect(result).toEqual(tokenResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: 'app-client-id',
        client_secret: 'app-client-secret',
        code: 'AUTH-CODE-123',
        redirect_uri: 'https://myapp.com/callback',
      });
    });
  });
});
