import { CreateSkuMappingUseCase } from '@application/integrationUseCases/createSkuMappingUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSkuMapping } from '../../../src/integrations/shared/domain/entities/integrationSkuMapping.entity';
import { ConflictError, NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSkuMappingRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('CreateSkuMappingUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: CreateSkuMappingUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSkuMappingRepository: jest.Mocked<IIntegrationSkuMappingRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

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

    mockSkuMappingRepository = {
      findByConnectionId: jest.fn(),
      findByExternalSku: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationSkuMappingRepository>;

    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
    } as unknown as jest.Mocked<IProductRepository>;

    useCase = new CreateSkuMappingUseCase(
      mockConnectionRepository,
      mockSkuMappingRepository,
      mockProductRepository
    );
  });

  it('Given: valid request When: creating mapping Then: should return success', async () => {
    const connection = IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'test',
        storeName: 'Test',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'key',
        encryptedAppToken: 'token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
      },
      'conn-1',
      mockOrgId
    );
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockProductRepository.findById.mockResolvedValue({
      id: 'prod-1',
      name: { getValue: () => 'Test Product' },
      sku: { getValue: () => 'SKU-001' },
    } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(null);
    mockSkuMappingRepository.save.mockImplementation(async m => m);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalSku: 'VTEX-001',
      productId: 'prod-1',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.externalSku).toBe('VTEX-001');
        expect(value.data.productId).toBe('prod-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent connection When: creating mapping Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      externalSku: 'VTEX-001',
      productId: 'prod-1',
      orgId: mockOrgId,
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

  it('Given: duplicate mapping When: creating Then: should return ConflictError', async () => {
    const connection = IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'test',
        storeName: 'Test',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'key',
        encryptedAppToken: 'token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
      },
      'conn-1',
      mockOrgId
    );
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockProductRepository.findById.mockResolvedValue({ id: 'prod-1' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(
      IntegrationSkuMapping.create(
        { connectionId: 'conn-1', externalSku: 'VTEX-001', productId: 'prod-1' },
        mockOrgId
      )
    );

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalSku: 'VTEX-001',
      productId: 'prod-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
      }
    );
  });
});
