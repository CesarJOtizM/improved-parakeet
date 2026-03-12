import { MeliExchangeAuthCodeUseCase } from '../../../src/integrations/mercadolibre/application/meliExchangeAuthCodeUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { MeliTokenService } from '../../../src/integrations/mercadolibre/infrastructure/meliTokenService';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('MeliExchangeAuthCodeUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: MeliExchangeAuthCodeUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockMeliTokenService: jest.Mocked<MeliTokenService>;

  const createMockConnection = (overrides: Partial<{ provider: string }> = {}) =>
    IntegrationConnection.reconstitute(
      {
        provider: overrides.provider ?? 'MERCADOLIBRE',
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

    mockMeliTokenService = {
      getValidAccessToken: jest.fn(),
      exchangeAuthCode: jest.fn(),
    } as unknown as jest.Mocked<MeliTokenService>;

    useCase = new MeliExchangeAuthCodeUseCase(
      mockConnectionRepository,
      mockEncryptionService,
      mockMeliTokenService
    );
  });

  it('Given: valid MERCADOLIBRE connection and auth code When: exchanging Then: should exchange auth code successfully', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt
      .mockReturnValueOnce('plain-client-id')
      .mockReturnValueOnce('plain-client-secret');
    mockMeliTokenService.exchangeAuthCode.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 21600,
      scope: 'read write',
      user_id: 54321,
      token_type: 'bearer',
    });
    mockEncryptionService.encrypt
      .mockReturnValueOnce('enc-new-access')
      .mockReturnValueOnce('enc-new-refresh');
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      authCode: 'AUTH-CODE-XYZ',
      redirectUri: 'https://myapp.com/callback',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.connectionId).toBe('conn-1');
        expect(value.data.status).toBe('CONNECTED');
        expect(value.data.meliUserId).toBe('54321');
        expect(value.message).toContain('successful');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted-client-id');
    expect(mockEncryptionService.decrypt).toHaveBeenCalledWith('encrypted-client-secret');
    expect(mockMeliTokenService.exchangeAuthCode).toHaveBeenCalledWith(
      'plain-client-id',
      'plain-client-secret',
      'AUTH-CODE-XYZ',
      'https://myapp.com/callback'
    );
    expect(mockConnectionRepository.update).toHaveBeenCalled();
  });

  it('Given: non-MERCADOLIBRE connection When: exchanging auth code Then: should return error', async () => {
    const connection = createMockConnection({ provider: 'VTEX' });
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      authCode: 'AUTH-CODE-XYZ',
      redirectUri: 'https://myapp.com/callback',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('INVALID_PROVIDER');
      }
    );
    expect(mockMeliTokenService.exchangeAuthCode).not.toHaveBeenCalled();
  });

  it('Given: connection not found When: exchanging auth code Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      authCode: 'AUTH-CODE-XYZ',
      redirectUri: 'https://myapp.com/callback',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('INTEGRATION_CONNECTION_NOT_FOUND');
      }
    );
  });

  it('Given: token exchange fails When: exchanging auth code Then: should return error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt
      .mockReturnValueOnce('plain-client-id')
      .mockReturnValueOnce('plain-client-secret');
    mockMeliTokenService.exchangeAuthCode.mockRejectedValue(new Error('OAuth failed'));

    const result = await useCase.execute({
      connectionId: 'conn-1',
      authCode: 'BAD-CODE',
      redirectUri: 'https://myapp.com/callback',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('MELI_AUTH_CODE_EXCHANGE_ERROR');
        expect(error.message).toContain('OAuth failed');
      }
    );
  });

  it('Given: non-Error thrown during exchange When: exchanging Then: should return Unknown error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt
      .mockReturnValueOnce('plain-client-id')
      .mockReturnValueOnce('plain-client-secret');
    mockMeliTokenService.exchangeAuthCode.mockRejectedValue('string-error');

    const result = await useCase.execute({
      connectionId: 'conn-1',
      authCode: 'CODE',
      redirectUri: 'https://myapp.com/callback',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.message).toContain('Unknown error');
      }
    );
  });
});
