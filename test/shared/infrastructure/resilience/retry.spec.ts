import { retry } from '@shared/infrastructure/resilience/retry';

describe('retry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retry(fn, { maxAttempts: 3, name: 'test' });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed eventually', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await retry(fn, {
      maxAttempts: 3,
      initialDelay: 10,
      name: 'test',
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent-fail'));

    await expect(retry(fn, { maxAttempts: 3, initialDelay: 10, name: 'test' })).rejects.toThrow(
      'persistent-fail'
    );

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const nonRetryableError = new Error('auth-error');
    const fn = jest.fn().mockRejectedValue(nonRetryableError);

    await expect(
      retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: error => (error as Error).message !== 'auth-error',
        name: 'test',
      })
    ).rejects.toThrow('auth-error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should apply exponential backoff', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const start = Date.now();
    await retry(fn, {
      maxAttempts: 3,
      initialDelay: 50,
      backoffMultiplier: 2,
      name: 'test',
    });
    const elapsed = Date.now() - start;

    // First retry: ~50ms (with jitter 25-50ms), second retry: ~100ms (with jitter 50-100ms)
    // Total minimum: ~75ms
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default options when none provided', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retry(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
