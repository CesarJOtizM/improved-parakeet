import { TimeoutError, withTimeout } from '@shared/infrastructure/resilience/timeout';

describe('withTimeout', () => {
  it('should return result when operation completes within timeout', async () => {
    const result = await withTimeout(async () => 'ok', 1000, 'test');
    expect(result).toBe('ok');
  });

  it('should throw TimeoutError when operation exceeds timeout', async () => {
    const slowFn = () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 500));

    await expect(withTimeout(slowFn, 50, 'SlowOp')).rejects.toThrow(TimeoutError);
    await expect(withTimeout(slowFn, 50, 'SlowOp')).rejects.toThrow(
      'Operation [SlowOp] timed out after 50ms'
    );
  });

  it('should propagate original errors (not timeout)', async () => {
    const failingFn = async () => {
      throw new Error('original-error');
    };

    await expect(withTimeout(failingFn, 1000, 'test')).rejects.toThrow('original-error');
  });

  it('should clear timeout on success', async () => {
    jest.useFakeTimers();

    const fn = jest.fn().mockResolvedValue('ok');
    const promise = withTimeout(fn, 1000);

    jest.advanceTimersByTime(0);
    await expect(promise).resolves.toBe('ok');

    // Advancing past timeout should NOT cause issues
    jest.advanceTimersByTime(2000);

    jest.useRealTimers();
  });

  it('should work without operation name', async () => {
    const slowFn = () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 500));

    await expect(withTimeout(slowFn, 50)).rejects.toThrow('Operation timed out after 50ms');
  });
});
