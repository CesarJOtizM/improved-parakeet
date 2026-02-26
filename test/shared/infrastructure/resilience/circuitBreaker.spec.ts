import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitState,
} from '@shared/infrastructure/resilience/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      successThreshold: 2,
      name: 'test',
    });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('should pass through successful calls in CLOSED state', async () => {
    const result = await breaker.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('should transition to OPEN after reaching failure threshold', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }

    expect(breaker.currentState).toBe(CircuitState.OPEN);
  });

  it('should fail fast when circuit is OPEN', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }

    // Should fail fast without calling the function
    await expect(breaker.execute(async () => 'ok')).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('should transition to HALF_OPEN after resetTimeout', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Next call should be allowed (HALF_OPEN)
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
  });

  it('should transition back to CLOSED after successThreshold in HALF_OPEN', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Success calls to recover
    await breaker.execute(async () => 'ok');
    await breaker.execute(async () => 'ok');

    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('should re-open if a failure occurs in HALF_OPEN', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Fail again in HALF_OPEN
    await expect(breaker.execute(failing)).rejects.toThrow('fail');
    expect(breaker.currentState).toBe(CircuitState.OPEN);
  });

  it('should reset failure count on successful call in CLOSED state', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Two failures (below threshold of 3)
    await expect(breaker.execute(failing)).rejects.toThrow();
    await expect(breaker.execute(failing)).rejects.toThrow();

    // One success resets the counter
    await breaker.execute(async () => 'ok');

    // Two more failures should NOT open the circuit
    await expect(breaker.execute(failing)).rejects.toThrow();
    await expect(breaker.execute(failing)).rejects.toThrow();

    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('should support manual reset', async () => {
    const failing = async () => {
      throw new Error('fail');
    };

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow('fail');
    }
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    breaker.reset();
    expect(breaker.currentState).toBe(CircuitState.CLOSED);

    // Should work again
    const result = await breaker.execute(async () => 'ok');
    expect(result).toBe('ok');
  });
});
