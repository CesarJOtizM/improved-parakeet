import { Logger } from '@nestjs/common';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds before the first retry */
  initialDelay: number;
  /** Multiplier applied to delay after each retry (exponential backoff) */
  backoffMultiplier: number;
  /** Maximum delay in milliseconds between retries */
  maxDelay: number;
  /** Optional predicate to decide if the error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional name for logging */
  name?: string;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 200,
  backoffMultiplier: 2,
  maxDelay: 10_000,
};

/**
 * Retry with Exponential Backoff
 *
 * Retries a failing operation with increasing delays between attempts.
 * Supports jitter to prevent thundering herd problems.
 *
 * @example
 * ```ts
 * const result = await retry(
 *   () => externalApi.call(),
 *   { maxAttempts: 3, name: 'ExternalAPI' }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger(`Retry:${config.name ?? 'default'}`);
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (config.isRetryable && !config.isRetryable(error)) {
        logger.debug(`Non-retryable error on attempt ${attempt} — aborting`);
        throw error;
      }

      if (attempt === config.maxAttempts) {
        logger.warn(`All ${config.maxAttempts} attempts exhausted`);
        break;
      }

      const delay = calculateDelay(attempt, config);
      logger.debug(`Attempt ${attempt}/${config.maxAttempts} failed — retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Calculate delay with exponential backoff + jitter
 */
function calculateDelay(attempt: number, config: RetryOptions): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter: random value between 50% and 100% of the calculated delay
  const jitter = cappedDelay * (0.5 + Math.random() * 0.5);
  return Math.round(jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
