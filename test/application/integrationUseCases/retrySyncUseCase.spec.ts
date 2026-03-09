import { RetrySyncUseCase } from '@application/integrationUseCases/retrySyncUseCase';
import { VtexSyncOrderUseCase } from '../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';

describe('RetrySyncUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: RetrySyncUseCase;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;
  let mockSyncOrderUseCase: jest.Mocked<VtexSyncOrderUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    useCase = new RetrySyncUseCase(mockSyncLogRepository, mockSyncOrderUseCase);
  });

  it('Given: failed sync log exists When: retrying Then: should sync order and return success', async () => {
    const failedLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: 'ORD-001',
        action: 'FAILED',
        errorMessage: 'SKU not mapped',
        processedAt: new Date(),
      },
      'log-1',
      mockOrgId
    );
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [failedLog],
      total: 1,
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'Synced',
        data: { externalOrderId: 'ORD-001', action: 'SYNCED', saleId: 'sale-1' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await useCase.execute({
      syncLogId: 'log-1',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.externalOrderId).toBe('ORD-001');
        expect(value.data.action).toBe('SYNCED');
        expect(value.data.saleId).toBe('sale-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockSyncOrderUseCase.execute).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-001',
      orgId: mockOrgId,
    });
  });

  it('Given: sync log not found When: retrying Then: should return NotFoundError', async () => {
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [],
      total: 0,
    });

    const result = await useCase.execute({
      syncLogId: 'non-existent',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('SYNC_LOG_NOT_FOUND');
      }
    );
  });

  it('Given: sync order fails When: retrying Then: should propagate error', async () => {
    const failedLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: 'ORD-001',
        action: 'FAILED',
        errorMessage: 'SKU not mapped',
        processedAt: new Date(),
      },
      'log-1',
      mockOrgId
    );
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [failedLog],
      total: 1,
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      err(new ValidationError('SKU still not mapped', 'SKU_NOT_FOUND'))
    );

    const result = await useCase.execute({
      syncLogId: 'log-1',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('SKU_NOT_FOUND');
      }
    );
  });

  it('Given: exception thrown When: retrying Then: should catch and return error', async () => {
    mockSyncLogRepository.findByConnectionId.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({
      syncLogId: 'log-1',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('SYNC_RETRY_ERROR');
      }
    );
  });
});
