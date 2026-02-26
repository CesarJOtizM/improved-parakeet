import { Logger } from '@nestjs/common';

import { CircuitBreaker, type CircuitBreakerOptions } from './circuitBreaker';
import { retry, type RetryOptions } from './retry';
import { withTimeout } from './timeout';

export interface ResilientCallOptions {
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerOptions>;
  /** Retry configuration */
  retry?: Partial<RetryOptions>;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Operation name for logging */
  name: string;
}

/**
 * Resilient Call — Composes Circuit Breaker + Retry + Timeout
 *
 * Provides a single entry point for resilient external service calls.
 * Execution order: Circuit Breaker → Retry (with Timeout per attempt)
 *
 * @example
 * ```ts
 * const resilient = new ResilientCall({
 *   name: 'EmailService',
 *   timeoutMs: 5000,
 *   retry: { maxAttempts: 3 },
 *   circuitBreaker: { failureThreshold: 5 },
 * });
 *
 * const result = await resilient.execute(() => emailService.send(email));
 * ```
 */
export class ResilientCall {
  private readonly logger: Logger;
  private readonly breaker: CircuitBreaker;
  private readonly options: ResilientCallOptions;

  constructor(options: ResilientCallOptions) {
    this.options = options;
    this.logger = new Logger(`ResilientCall:${options.name}`);
    this.breaker = new CircuitBreaker({
      ...options.circuitBreaker,
      name: options.name,
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(() => this.retryWithTimeout(fn));
  }

  private async retryWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const wrappedFn = this.options.timeoutMs
      ? () => withTimeout(fn, this.options.timeoutMs!, this.options.name)
      : fn;

    if (this.options.retry) {
      return retry(wrappedFn, {
        ...this.options.retry,
        name: this.options.name,
      });
    }

    return wrappedFn();
  }

  resetCircuit(): void {
    this.breaker.reset();
    this.logger.log('Circuit breaker reset manually');
  }
}
