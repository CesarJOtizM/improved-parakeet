import { VtexPollingJob } from '../../../src/integrations/vtex/jobs/vtexPollingJob';
import { VtexPollOrdersUseCase } from '../../../src/integrations/vtex/application/vtexPollOrdersUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

describe('VtexPollingJob', () => {
  let job: VtexPollingJob;
  let mockPollUseCase: jest.Mocked<VtexPollOrdersUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPollUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VtexPollOrdersUseCase>;

    job = new VtexPollingJob(mockPollUseCase);
  });

  it('Given: successful polling When: job runs Then: should complete without error', async () => {
    mockPollUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { polled: 5, synced: 3, failed: 2 },
        timestamp: new Date().toISOString(),
      })
    );

    await expect(job.pollOrders()).resolves.not.toThrow();
    expect(mockPollUseCase.execute).toHaveBeenCalledWith({});
  });

  it('Given: polling returns error result When: job runs Then: should not throw', async () => {
    mockPollUseCase.execute.mockResolvedValue(
      err(new ValidationError('Polling failed', 'POLL_ERROR'))
    );

    await expect(job.pollOrders()).resolves.not.toThrow();
  });

  it('Given: polling throws exception When: job runs Then: should catch and not throw', async () => {
    mockPollUseCase.execute.mockRejectedValue(new Error('Network error'));

    await expect(job.pollOrders()).resolves.not.toThrow();
  });

  it('Given: zero orders polled When: job runs Then: should complete silently', async () => {
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
