import { UpdateIntegrationConnectionUseCase } from '@application/integrationUseCases/updateIntegrationConnectionUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('UpdateIntegrationConnectionUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: UpdateIntegrationConnectionUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'old-encrypted-key',
        encryptedAppToken: 'old-encrypted-token',
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
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationConnectionRepository>;

    mockWarehouseRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findActive: jest.fn(),
      findByCode: jest.fn(),
      existsByCode: jest.fn(),
    } as unknown as jest.Mocked<IWarehouseRepository>;

    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<EncryptionService>;

    useCase = new UpdateIntegrationConnectionUseCase(
      mockConnectionRepository,
      mockWarehouseRepository,
      mockEncryptionService
    );
  });

  it('Given: existing connection When: updating storeName Then: should return success', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      orgId: mockOrgId,
      storeName: 'Updated Store',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.storeName).toBe('Updated Store');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing connection When: updating credentials Then: should re-encrypt', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.encrypt.mockReturnValueOnce('new-encrypted-key');
    mockEncryptionService.encrypt.mockReturnValueOnce('new-encrypted-token');
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      orgId: mockOrgId,
      appKey: 'new-plain-key',
      appToken: 'new-plain-token',
    });

    expect(result.isOk()).toBe(true);
    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('new-plain-key');
    expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('new-plain-token');
  });

  it('Given: non-existent connection When: updating Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      orgId: mockOrgId,
      storeName: 'New Name',
    });

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

  it('Given: invalid warehouse When: updating warehouseId Then: should return NotFoundError', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockWarehouseRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      orgId: mockOrgId,
      defaultWarehouseId: 'non-existent-wh',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('WAREHOUSE_NOT_FOUND');
      }
    );
  });
});
