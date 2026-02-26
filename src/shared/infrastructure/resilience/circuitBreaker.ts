import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting recovery (OPEN → HALF_OPEN) */
  resetTimeout: number;
  /** Number of successful calls in HALF_OPEN state before closing the circuit */
  successThreshold: number;
  /** Optional name for logging */
  name?: string;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30_000,
  successThreshold: 2,
};

/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by monitoring external service calls.
 *
 * States:
 * - CLOSED: Normal operation, all calls pass through
 * - OPEN: Failures exceeded threshold, all calls fail fast
 * - HALF_OPEN: Recovery attempt, limited calls allowed
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({ name: 'EmailService', failureThreshold: 3 });
 * const result = await breaker.execute(() => emailService.send(email));
 * ```
 */
export class CircuitBreaker {
  private readonly logger: Logger;
  private readonly options: CircuitBreakerOptions;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger = new Logger(`CircuitBreaker:${this.options.name ?? 'default'}`);
  }

  get currentState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker [${this.options.name}] is OPEN. Failing fast.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.transitionTo(CircuitState.CLOSED);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.reset();
        this.logger.log('Circuit recovered — transitioning to CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      this.logger.warn('Recovery failed — circuit re-opened');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
      this.logger.warn(
        `Failure threshold reached (${this.failureCount}/${this.options.failureThreshold}) — circuit OPEN`
      );
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (this.lastFailureTime === null) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.logger.debug(`State transition: ${this.state} → ${newState}`);
      this.state = newState;
      if (newState === CircuitState.HALF_OPEN) {
        this.successCount = 0;
      }
    }
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
