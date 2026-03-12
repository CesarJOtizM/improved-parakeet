import { GetUnmatchedSkusUseCase } from '@application/integrationUseCases/getUnmatchedSkusUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';

describe('GetUnmatchedSkusUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetUnmatchedSkusUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;

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

    mockSyncLogRepository = {
      save: jest.fn(),
      findByExternalOrderId: jest.fn(),
      findByConnectionId: jest.fn(),
      findFailedByConnectionId: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IIntegrationSyncLogRepository>;

    useCase = new GetUnmatchedSkusUseCase(mockConnectionRepository, mockSyncLogRepository);
  });

  it('Given: failed sync logs exist When: getting unmatched Then: should return failed logs', async () => {
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
    const failedLogs = [
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'FAILED',
          errorMessage: 'SKU VTEX-999 not mapped',
          processedAt: new Date('2024-01-15'),
        },
        'log-1',
        mockOrgId
      ),
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-002',
          action: 'FAILED',
          errorMessage: 'Product not found',
          processedAt: new Date('2024-01-16'),
        },
        'log-2',
        mockOrgId
      ),
    ];
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findFailedByConnectionId.mockResolvedValue(failedLogs);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(2);
        expect(value.data[0].externalOrderId).toBe('ORD-001');
        expect(value.data[0].errorMessage).toContain('VTEX-999');
        expect(value.data[1].externalOrderId).toBe('ORD-002');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no failed logs When: getting unmatched Then: should return empty list', async () => {
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
    mockSyncLogRepository.findFailedByConnectionId.mockResolvedValue([]);

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

  it('Given: non-existent connection When: getting unmatched Then: should return NotFoundError', async () => {
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
