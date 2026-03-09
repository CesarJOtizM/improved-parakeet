import { GetSkuMappingsUseCase } from '@application/integrationUseCases/getSkuMappingsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSkuMapping } from '../../../src/integrations/shared/domain/entities/integrationSkuMapping.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSkuMappingRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port';

describe('GetSkuMappingsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetSkuMappingsUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSkuMappingRepository: jest.Mocked<IIntegrationSkuMappingRepository>;

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

    mockSkuMappingRepository = {
      findByConnectionId: jest.fn(),
      findByExternalSku: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationSkuMappingRepository>;

    useCase = new GetSkuMappingsUseCase(mockConnectionRepository, mockSkuMappingRepository);
  });

  it('Given: existing connection with mappings When: getting mappings Then: should return list', async () => {
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
    const mappings = [
      IntegrationSkuMapping.reconstitute(
        { connectionId: 'conn-1', externalSku: 'VTEX-001', productId: 'prod-1' },
        'map-1',
        mockOrgId
      ),
      IntegrationSkuMapping.reconstitute(
        { connectionId: 'conn-1', externalSku: 'VTEX-002', productId: 'prod-2' },
        'map-2',
        mockOrgId
      ),
    ];
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSkuMappingRepository.findByConnectionId.mockResolvedValue(mappings);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(2);
        expect(value.data[0].externalSku).toBe('VTEX-001');
        expect(value.data[1].externalSku).toBe('VTEX-002');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing connection with no mappings When: getting mappings Then: should return empty list', async () => {
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
    mockSkuMappingRepository.findByConnectionId.mockResolvedValue([]);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data).toHaveLength(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent connection When: getting mappings Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ connectionId: 'non-existent', orgId: mockOrgId });

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
});
