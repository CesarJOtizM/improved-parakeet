/**
 * Timeout Wrapper
 *
 * Wraps an async operation with a timeout. If the operation takes longer
 * than the specified duration, it rejects with a TimeoutError.
 *
 * @example
 * ```ts
 * const result = await withTimeout(
 *   () => externalApi.call(),
 *   5000,
 *   'ExternalAPI'
 * );
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(
          `Operation${operationName ? ` [${operationName}]` : ''} timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
