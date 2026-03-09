import { CreateIntegrationConnectionUseCase } from '@application/integrationUseCases/createIntegrationConnectionUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { ConflictError, NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('CreateIntegrationConnectionUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: CreateIntegrationConnectionUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;

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

    useCase = new CreateIntegrationConnectionUseCase(
      mockConnectionRepository,
      mockWarehouseRepository,
      mockEncryptionService
    );
  });

  describe('execute', () => {
    const defaultRequest = {
      provider: 'VTEX',
      accountName: 'teststore',
      storeName: 'Test Store',
      appKey: 'plain-key',
      appToken: 'plain-token',
      defaultWarehouseId: 'wh-1',
      createdBy: 'user-1',
      orgId: mockOrgId,
    };

    it('Given: valid request When: creating connection Then: should return success', async () => {
      mockWarehouseRepository.findById.mockResolvedValue({ id: 'wh-1' } as any);
      mockConnectionRepository.findByProviderAndAccount.mockResolvedValue(null);
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-key');
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-token');
      mockConnectionRepository.save.mockImplementation(async conn => conn);

      const result = await useCase.execute(defaultRequest);

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Integration connection created successfully');
          expect(value.data.provider).toBe('VTEX');
          expect(value.data.accountName).toBe('teststore');
          expect(value.data.status).toBe('DISCONNECTED');
          expect(value.data.webhookSecret).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockEncryptionService.encrypt).toHaveBeenCalledTimes(2);
    });

    it('Given: non-existent warehouse When: creating connection Then: should return NotFoundError', async () => {
      mockWarehouseRepository.findById.mockResolvedValue(null);

      const result = await useCase.execute(defaultRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Default warehouse not found');
        }
      );
    });

    it('Given: duplicate connection When: creating Then: should return ConflictError', async () => {
      mockWarehouseRepository.findById.mockResolvedValue({ id: 'wh-1' } as any);
      mockConnectionRepository.findByProviderAndAccount.mockResolvedValue(
        IntegrationConnection.create(
          {
            provider: 'VTEX',
            accountName: 'teststore',
            storeName: 'Existing Store',
            syncStrategy: 'BOTH',
            syncDirection: 'BIDIRECTIONAL',
            encryptedAppKey: 'key',
            encryptedAppToken: 'token',
            webhookSecret: 'secret',
            defaultWarehouseId: 'wh-1',
            createdBy: 'user-1',
          },
          mockOrgId
        )
      );

      const result = await useCase.execute(defaultRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.code).toBe('INTEGRATION_CONNECTION_CONFLICT');
        }
      );
    });

    it('Given: Prisma P2002 error When: creating Then: should return ConflictError', async () => {
      mockWarehouseRepository.findById.mockResolvedValue({ id: 'wh-1' } as any);
      mockConnectionRepository.findByProviderAndAccount.mockResolvedValue(null);
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-key');
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-token');
      mockConnectionRepository.save.mockRejectedValue({ code: 'P2002' });

      const result = await useCase.execute(defaultRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.code).toBe('INTEGRATION_CONNECTION_CONFLICT');
        }
      );
    });

    it('Given: unknown error When: creating Then: should return ValidationError', async () => {
      mockWarehouseRepository.findById.mockResolvedValue({ id: 'wh-1' } as any);
      mockConnectionRepository.findByProviderAndAccount.mockResolvedValue(null);
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-key');
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-token');
      mockConnectionRepository.save.mockRejectedValue(new Error('DB error'));

      const result = await useCase.execute(defaultRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.code).toBe('INTEGRATION_CONNECTION_CREATION_ERROR');
        }
      );
    });

    it('Given: non-Error thrown When: creating Then: should handle unknown error type', async () => {
      mockWarehouseRepository.findById.mockResolvedValue({ id: 'wh-1' } as any);
      mockConnectionRepository.findByProviderAndAccount.mockResolvedValue(null);
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-key');
      mockEncryptionService.encrypt.mockReturnValueOnce('encrypted-token');
      mockConnectionRepository.save.mockRejectedValue('string error');

      const result = await useCase.execute(defaultRequest);

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
});
