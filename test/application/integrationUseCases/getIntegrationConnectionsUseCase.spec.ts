import { GetIntegrationConnectionsUseCase } from '@application/integrationUseCases/getIntegrationConnectionsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('GetIntegrationConnectionsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetIntegrationConnectionsUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;

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

    useCase = new GetIntegrationConnectionsUseCase(mockConnectionRepository);
  });

  it('Given: connections exist When: getting all Then: should return list', async () => {
    const connections = [
      IntegrationConnection.reconstitute(
        {
          provider: 'VTEX',
          accountName: 'store1',
          storeName: 'Store 1',
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
      ),
    ];
    mockConnectionRepository.findByOrgId.mockResolvedValue(connections);

    const result = await useCase.execute({ orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(1);
        expect(value.data[0].provider).toBe('VTEX');
        expect(value.data[0].accountName).toBe('store1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no connections When: getting all Then: should return empty list', async () => {
    mockConnectionRepository.findByOrgId.mockResolvedValue([]);

    const result = await useCase.execute({ orgId: mockOrgId });

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

  it('Given: provider filter When: getting connections Then: should pass filter to repository', async () => {
    mockConnectionRepository.findByOrgId.mockResolvedValue([]);

    await useCase.execute({ orgId: mockOrgId, provider: 'VTEX', status: 'CONNECTED' });

    expect(mockConnectionRepository.findByOrgId).toHaveBeenCalledWith(mockOrgId, {
      provider: 'VTEX',
      status: 'CONNECTED',
    });
  });
});
