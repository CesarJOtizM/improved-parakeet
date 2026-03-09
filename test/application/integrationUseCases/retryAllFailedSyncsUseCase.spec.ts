import { RetryAllFailedSyncsUseCase } from '@application/integrationUseCases/retryAllFailedSyncsUseCase';
import { VtexSyncOrderUseCase } from '../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';

describe('RetryAllFailedSyncsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: RetryAllFailedSyncsUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;
  let mockSyncOrderUseCase: jest.Mocked<VtexSyncOrderUseCase>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
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

    mockSyncLogRepository = {
      save: jest.fn(),
      findByExternalOrderId: jest.fn(),
      findByConnectionId: jest.fn(),
      findFailedByConnectionId: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IIntegrationSyncLogRepository>;

    mockSyncOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VtexSyncOrderUseCase>;

    useCase = new RetryAllFailedSyncsUseCase(
      mockConnectionRepository,
      mockSyncLogRepository,
      mockSyncOrderUseCase
    );
  });

  it('Given: failed logs exist When: retrying all Then: should retry each and return summary', async () => {
    const connection = createMockConnection();
    const failedLogs = [
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'FAILED',
          errorMessage: 'Error 1',
          processedAt: new Date(),
        },
        'log-1',
        mockOrgId
      ),
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-002',
          action: 'FAILED',
          errorMessage: 'Error 2',
          processedAt: new Date(),
        },
        'log-2',
        mockOrgId
      ),
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-003',
          action: 'FAILED',
          errorMessage: 'Error 3',
          processedAt: new Date(),
        },
        'log-3',
        mockOrgId
      ),
    ];
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findFailedByConnectionId.mockResolvedValue(failedLogs);
    mockSyncOrderUseCase.execute
      .mockResolvedValueOnce(
        ok({
          success: true,
          message: 'OK',
          data: { externalOrderId: 'ORD-001', action: 'SYNCED', saleId: 'sale-1' },
          timestamp: new Date().toISOString(),
        })
      )
      .mockResolvedValueOnce(err(new ValidationError('Still failed', 'SYNC_ERROR')))
      .mockResolvedValueOnce(
        ok({
          success: true,
          message: 'OK',
          data: { externalOrderId: 'ORD-003', action: 'SYNCED', saleId: 'sale-3' },
          timestamp: new Date().toISOString(),
        })
      );

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.total).toBe(3);
        expect(value.data.succeeded).toBe(2);
        expect(value.data.failed).toBe(1);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockSyncOrderUseCase.execute).toHaveBeenCalledTimes(3);
  });

  it('Given: no failed logs When: retrying all Then: should return zero counts', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findFailedByConnectionId.mockResolvedValue([]);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.total).toBe(0);
        expect(value.data.succeeded).toBe(0);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent connection When: retrying all Then: should return NotFoundError', async () => {
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

  it('Given: all retries fail When: retrying all Then: should report all as failed', async () => {
    const connection = createMockConnection();
    const failedLogs = [
      IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'FAILED',
          errorMessage: 'Error 1',
          processedAt: new Date(),
        },
        'log-1',
        mockOrgId
      ),
    ];
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findFailedByConnectionId.mockResolvedValue(failedLogs);
    mockSyncOrderUseCase.execute.mockResolvedValue(
      err(new ValidationError('Still failed', 'SYNC_ERROR'))
    );

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.total).toBe(1);
        expect(value.data.succeeded).toBe(0);
        expect(value.data.failed).toBe(1);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });
});
