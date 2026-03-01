import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CircuitBreakerOpenError } from '@shared/infrastructure/resilience/circuitBreaker';
import { ResilientCall } from '@shared/infrastructure/resilience/resilientCall';
import { TimeoutError } from '@shared/infrastructure/resilience/timeout';

describe('ResilientCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('execute - successful calls', () => {
    it('Given: a function that succeeds immediately When: executing Then: should return the result', async () => {
      // Arrange
      const resilient = new ResilientCall({ name: 'TestService' });
      const fn = jest.fn<() => Promise<string>>();
      fn.mockResolvedValue('success');

      // Act
      const result = await resilient.execute(fn);

      // Assert
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('Given: a function returning a complex object When: executing Then: should preserve the return value', async () => {
      // Arrange
      const resilient = new ResilientCall({ name: 'TestService' });
      const expected = { data: [1, 2, 3], status: 'ok' };
      const fn = jest.fn<() => Promise<typeof expected>>();
      fn.mockResolvedValue(expected);

      // Act
      const result = await resilient.execute(fn);

      // Assert
      expect(result).toEqual(expected);
    });
  });

  describe('execute - retry on failure', () => {
    it('Given: a function that fails then succeeds When: retry is configured Then: should return the result after retrying', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'RetryTest',
        retry: { maxAttempts: 3, initialDelay: 1, backoffMultiplier: 1, maxDelay: 10 },
      });

      let attempt = 0;
      const fn = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        attempt++;
        if (attempt < 3) throw new Error(`Attempt ${attempt} failed`);
        return 'recovered';
      });

      // Act
      const result = await resilient.execute(fn);

      // Assert
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('Given: a function that always fails When: retry is configured Then: should throw after exhausting attempts', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'RetryExhaust',
        retry: { maxAttempts: 2, initialDelay: 1, backoffMultiplier: 1, maxDelay: 10 },
      });

      const fn = jest.fn<() => Promise<never>>();
      fn.mockRejectedValue(new Error('Persistent failure'));

      // Act & Assert
      await expect(resilient.execute(fn)).rejects.toThrow('Persistent failure');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('execute - circuit breaker', () => {
    it('Given: repeated failures exceed threshold When: circuit opens Then: subsequent calls should fail fast', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'CircuitTest',
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeout: 60000,
          successThreshold: 1,
        },
      });

      const fn = jest.fn<() => Promise<never>>();
      fn.mockRejectedValue(new Error('Service down'));

      // Trip the circuit breaker
      await expect(resilient.execute(fn)).rejects.toThrow('Service down');
      await expect(resilient.execute(fn)).rejects.toThrow('Service down');

      // Next call should fail fast with CircuitBreakerOpenError
      await expect(resilient.execute(fn)).rejects.toThrow(CircuitBreakerOpenError);
      // The fn should NOT have been called a third time because the circuit is open
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('Given: circuit breaker is open When: reset is called Then: should allow calls again', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'ResetTest',
        circuitBreaker: {
          failureThreshold: 1,
          resetTimeout: 60000,
          successThreshold: 1,
        },
      });

      const failFn = jest.fn<() => Promise<never>>();
      failFn.mockRejectedValue(new Error('fail'));

      // Trip the circuit
      await expect(resilient.execute(failFn)).rejects.toThrow('fail');
      await expect(resilient.execute(failFn)).rejects.toThrow(CircuitBreakerOpenError);

      // Reset and try again with a successful function
      resilient.resetCircuit();

      const successFn = jest.fn<() => Promise<string>>();
      successFn.mockResolvedValue('working');

      const result = await resilient.execute(successFn);
      expect(result).toBe('working');
    });
  });

  describe('execute - timeout', () => {
    it('Given: a function that takes too long When: timeout is configured Then: should throw TimeoutError', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'TimeoutTest',
        timeoutMs: 50,
      });

      const slowFn = jest
        .fn<() => Promise<string>>()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('late'), 200)));

      // Act & Assert
      await expect(resilient.execute(slowFn)).rejects.toThrow(TimeoutError);
    });

    it('Given: a function that completes within timeout When: timeout is configured Then: should return the result', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'FastTimeout',
        timeoutMs: 5000,
      });

      const fastFn = jest.fn<() => Promise<string>>();
      fastFn.mockResolvedValue('fast result');

      // Act
      const result = await resilient.execute(fastFn);

      // Assert
      expect(result).toBe('fast result');
    });
  });

  describe('execute - combined resilience', () => {
    it('Given: timeout + retry configured When: first attempt times out but second succeeds Then: should return the result', async () => {
      // Arrange
      const resilient = new ResilientCall({
        name: 'CombinedTest',
        timeoutMs: 50,
        retry: { maxAttempts: 3, initialDelay: 1, backoffMultiplier: 1, maxDelay: 10 },
      });

      let attempt = 0;
      const fn = jest.fn<() => Promise<string>>().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          // First attempt times out
          return new Promise(resolve => setTimeout(() => resolve('late'), 200));
        }
        return 'on-time';
      });

      // Act
      const result = await resilient.execute(fn);

      // Assert
      expect(result).toBe('on-time');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('Given: no retry or timeout configured When: executing a successful call Then: should work with defaults', async () => {
      // Arrange
      const resilient = new ResilientCall({ name: 'MinimalConfig' });
      const fn = jest.fn<() => Promise<number>>();
      fn.mockResolvedValue(42);

      // Act
      const result = await resilient.execute(fn);

      // Assert
      expect(result).toBe(42);
    });
  });

  describe('resetCircuit', () => {
    it('Given: a resilient call instance When: resetCircuit is called Then: should not throw', () => {
      // Arrange
      const resilient = new ResilientCall({ name: 'ResetCheck' });

      // Act & Assert
      expect(() => resilient.resetCircuit()).not.toThrow();
    });
  });
});
