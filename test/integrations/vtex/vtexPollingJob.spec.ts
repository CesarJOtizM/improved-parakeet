import { VtexPollingJob } from '../../../src/integrations/vtex/jobs/vtexPollingJob';
import { VtexPollOrdersUseCase } from '../../../src/integrations/vtex/application/vtexPollOrdersUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';

const makeVtexConnection = (overrides?: Partial<IntegrationConnection>) =>
  ({
    id: 'conn-1',
    provider: 'VTEX',
    status: 'CONNECTED',
    syncStrategy: 'POLLING',
    ...overrides,
  }) as unknown as IntegrationConnection;

describe('VtexPollingJob', () => {
  let job: VtexPollingJob;
  let mockPollUseCase: jest.Mocked<VtexPollOrdersUseCase>;
  let mockConnectionRepo: jest.Mocked<IIntegrationConnectionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPollUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VtexPollOrdersUseCase>;

    mockConnectionRepo = {
      findAllConnectedForPolling: jest.fn(),
    } as unknown as jest.Mocked<IIntegrationConnectionRepository>;

    job = new VtexPollingJob(mockConnectionRepo, mockPollUseCase);
  });

  it('Given: no VTEX connections When: job runs Then: should skip polling silently', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([]);

    await job.pollOrders();

    expect(mockConnectionRepo.findAllConnectedForPolling).toHaveBeenCalled();
    expect(mockPollUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: only MeLi connections When: job runs Then: should skip polling', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([
      makeVtexConnection({ provider: 'MERCADOLIBRE' }),
    ]);

    await job.pollOrders();

    expect(mockPollUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: VTEX connections exist When: job runs Then: should execute polling', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([
      makeVtexConnection(),
    ]);
    mockPollUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { polled: 5, synced: 3, failed: 2 },
        timestamp: new Date().toISOString(),
      })
    );

    await job.pollOrders();

    expect(mockPollUseCase.execute).toHaveBeenCalledWith({});
  });

  it('Given: polling returns error result When: job runs Then: should not throw', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([
      makeVtexConnection(),
    ]);
    mockPollUseCase.execute.mockResolvedValue(
      err(new ValidationError('Polling failed', 'POLL_ERROR'))
    );

    await expect(job.pollOrders()).resolves.not.toThrow();
  });

  it('Given: polling throws exception When: job runs Then: should catch and not throw', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([
      makeVtexConnection(),
    ]);
    mockPollUseCase.execute.mockRejectedValue(new Error('Network error'));

    await expect(job.pollOrders()).resolves.not.toThrow();
  });

  it('Given: zero orders polled When: job runs Then: should complete silently', async () => {
    mockConnectionRepo.findAllConnectedForPolling.mockResolvedValue([
      makeVtexConnection(),
    ]);
    mockPollUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { polled: 0, synced: 0, failed: 0 },
        timestamp: new Date().toISOString(),
      })
    );

    await expect(job.pollOrders()).resolves.not.toThrow();
  });
});
