import { VtexTestConnectionUseCase } from '../../../src/integrations/vtex/application/vtexTestConnectionUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('VtexTestConnectionUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: VtexTestConnectionUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockVtexApiClient: jest.Mocked<VtexApiClient>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: 'DISCONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
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

    mockVtexApiClient = {
      ping: jest.fn(),
      getOrder: jest.fn(),
      listOrders: jest.fn(),
      registerWebhook: jest.fn(),
      startHandling: jest.fn(),
      sendInvoice: jest.fn(),
      cancelOrder: jest.fn(),
    } as unknown as jest.Mocked<VtexApiClient>;

    useCase = new VtexTestConnectionUseCase(
      mockConnectionRepository,
      mockEncryptionService,
      mockVtexApiClient
    );
  });

  it('Given: valid connection When: ping succeeds Then: should return connected true', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.ping.mockResolvedValue(true);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.connected).toBe(true);
        expect(value.message).toContain('successful');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockVtexApiClient.ping).toHaveBeenCalledWith('teststore', 'plain-key', 'plain-token');
  });

  it('Given: valid connection When: ping fails Then: should return connected false', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.ping.mockResolvedValue(false);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.connected).toBe(false);
        expect(value.message).toContain('failed');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent connection When: testing Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ connectionId: 'non-existent', orgId: mockOrgId });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    );
  });
});
