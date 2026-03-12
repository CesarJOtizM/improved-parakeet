import { GetSyncLogsUseCase } from '../../../src/application/integrationUseCases/getSyncLogsUseCase';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';
import type { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';

const mockConnection = { id: 'conn-1', orgId: 'org-1' } as unknown as IntegrationConnection;

const makeSyncLog = (action: string, id: string) =>
  IntegrationSyncLog.reconstitute(
    {
      connectionId: 'conn-1',
      externalOrderId: `order-${id}`,
      action,
      saleId: action === 'SYNCED' ? `sale-${id}` : undefined,
      errorMessage: action === 'FAILED' ? 'SKU not found' : undefined,
      processedAt: new Date('2026-03-11T10:00:00Z'),
    },
    id,
    'org-1',
  );

describe('GetSyncLogsUseCase', () => {
  let useCase: GetSyncLogsUseCase;
  let mockConnectionRepo: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepo: jest.Mocked<IIntegrationSyncLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnectionRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IIntegrationConnectionRepository>;

    mockSyncLogRepo = {
      findByConnectionId: jest.fn(),
    } as unknown as jest.Mocked<IIntegrationSyncLogRepository>;

    useCase = new GetSyncLogsUseCase(mockConnectionRepo, mockSyncLogRepo);
  });

  it('Given: valid connection When: getting logs Then: should return paginated logs', async () => {
    mockConnectionRepo.findById.mockResolvedValue(mockConnection);
    mockSyncLogRepo.findByConnectionId.mockResolvedValue({
      data: [makeSyncLog('SYNCED', '1'), makeSyncLog('FAILED', '2')],
      total: 2,
    });

    const result = await useCase.execute({
      connectionId: 'conn-1',
      orgId: 'org-1',
      page: 1,
      limit: 20,
    });

    expect(result.isOk()).toBe(true);
    const value = result.unwrap();
    expect(value.data).toHaveLength(2);
    expect(value.pagination.total).toBe(2);
    expect(value.pagination.page).toBe(1);
    expect(value.pagination.limit).toBe(20);
    expect(value.pagination.totalPages).toBe(1);
  });

  it('Given: action filter When: getting logs Then: should pass filter to repository', async () => {
    mockConnectionRepo.findById.mockResolvedValue(mockConnection);
    mockSyncLogRepo.findByConnectionId.mockResolvedValue({ data: [], total: 0 });

    await useCase.execute({
      connectionId: 'conn-1',
      orgId: 'org-1',
      action: 'FAILED',
    });

    expect(mockSyncLogRepo.findByConnectionId).toHaveBeenCalledWith(
      'conn-1',
      1,
      20,
      { action: 'FAILED' },
    );
  });

  it('Given: non-existent connection When: getting logs Then: should return not found error', async () => {
    mockConnectionRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      orgId: 'org-1',
    });

    expect(result.isErr()).toBe(true);
    expect(mockSyncLogRepo.findByConnectionId).not.toHaveBeenCalled();
  });

  it('Given: no page/limit When: getting logs Then: should use defaults', async () => {
    mockConnectionRepo.findById.mockResolvedValue(mockConnection);
    mockSyncLogRepo.findByConnectionId.mockResolvedValue({ data: [], total: 0 });

    await useCase.execute({ connectionId: 'conn-1', orgId: 'org-1' });

    expect(mockSyncLogRepo.findByConnectionId).toHaveBeenCalledWith(
      'conn-1',
      1,
      20,
      undefined,
    );
  });

  it('Given: many logs When: getting logs Then: should calculate totalPages correctly', async () => {
    mockConnectionRepo.findById.mockResolvedValue(mockConnection);
    mockSyncLogRepo.findByConnectionId.mockResolvedValue({
      data: [makeSyncLog('SYNCED', '1')],
      total: 55,
    });

    const result = await useCase.execute({
      connectionId: 'conn-1',
      orgId: 'org-1',
      page: 1,
      limit: 20,
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().pagination.totalPages).toBe(3);
  });
});
