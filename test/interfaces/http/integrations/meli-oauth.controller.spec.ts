import { MeliOAuthController } from '../../../../src/interfaces/http/integrations/meli-oauth.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../../src/integrations/shared/encryption/encryption.service';
import { MeliExchangeAuthCodeUseCase } from '../../../../src/integrations/mercadolibre/application/meliExchangeAuthCodeUseCase';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { Response } from 'express';

describe('MeliOAuthController', () => {
  const mockOrgId = 'test-org-id';

  let controller: MeliOAuthController;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockExchangeUseCase: jest.Mocked<MeliExchangeAuthCodeUseCase>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'MERCADOLIBRE',
        accountName: 'testaccount',
        storeName: 'Test Store',
        status: 'DISCONNECTED',
        syncStrategy: 'POLLING',
        syncDirection: 'INBOUND',
        encryptedAppKey: 'encrypted-client-id',
        encryptedAppToken: 'encrypted-client-secret',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
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

    mockExchangeUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MeliExchangeAuthCodeUseCase>;

    controller = new MeliOAuthController(
      mockConnectionRepository,
      mockEncryptionService,
      mockExchangeUseCase
    );
  });

  describe('getAuthUrl', () => {
    it('Given: valid connection When: generating auth URL Then: should return URL with state parameter', async () => {
      const connection = createMockConnection();
      mockConnectionRepository.findById.mockResolvedValue(connection);
      mockEncryptionService.decrypt.mockReturnValue('plain-client-id-123');

      const result = await controller.getAuthUrl(
        { connectionId: 'conn-1', redirectUri: 'https://frontend.com/integrations' },
        mockOrgId
      );

      expect(result.success).toBe(true);
      expect(result.data!.authUrl).toContain('https://auth.mercadolibre.com/authorization');
      expect(result.data!.authUrl).toContain('client_id=plain-client-id-123');
      expect(result.data!.authUrl).toContain('response_type=code');
      // State should contain connectionId:orgId:redirectUri
      expect(result.data!.authUrl).toContain('state=');
    });

    it('Given: connection not found When: generating auth URL Then: should return error', async () => {
      mockConnectionRepository.findById.mockResolvedValue(null);

      const result = await controller.getAuthUrl(
        { connectionId: 'non-existent', redirectUri: 'https://frontend.com' },
        mockOrgId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection not found');
    });
  });

  describe('handleCallback', () => {
    const createMockResponse = () => {
      const res = {
        redirect: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as jest.Mocked<Response>;
      return res;
    };

    it('Given: valid callback with code and state When: handling Then: should exchange code and redirect to frontend', async () => {
      const mockRes = createMockResponse();
      const state = `conn-1:${mockOrgId}:${encodeURIComponent('https://frontend.com/integrations')}`;

      mockExchangeUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Auth successful',
          data: { connectionId: 'conn-1', status: 'CONNECTED', meliUserId: '54321' },
          timestamp: new Date().toISOString(),
        })
      );

      await controller.handleCallback('AUTH-CODE-XYZ', state, mockRes);

      expect(mockExchangeUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        authCode: 'AUTH-CODE-XYZ',
        redirectUri: expect.stringContaining('/integrations/meli/callback'),
        orgId: mockOrgId,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('meli_connected=true'));
    });

    it('Given: exchange use case fails When: handling callback Then: should redirect with error', async () => {
      const mockRes = createMockResponse();
      const state = `conn-1:${mockOrgId}:${encodeURIComponent('https://frontend.com/integrations')}`;

      mockExchangeUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid auth code', 'MELI_AUTH_CODE_EXCHANGE_ERROR'))
      );

      await controller.handleCallback('BAD-CODE', state, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('meli_error='));
    });

    it('Given: exception thrown during callback When: handling Then: should return 500 error', async () => {
      const mockRes = createMockResponse();
      const state = `conn-1:${mockOrgId}:${encodeURIComponent('https://frontend.com/integrations')}`;

      mockExchangeUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      await controller.handleCallback('CODE', state, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'OAuth callback failed',
        })
      );
    });
  });
});
