// Result to HTTP Response Utility
// Converts Result<T, DomainError> to HTTP responses or throws appropriate exceptions

import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AuthenticationError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
  RateLimitError,
  Result,
  TokenError,
  ValidationError,
} from '@shared/domain/result';

/**
 * Maps DomainError subclass to HTTP status code
 */
function getHttpStatus(error: DomainError): number {
  if (error instanceof AuthenticationError || error instanceof TokenError) {
    return HttpStatus.UNAUTHORIZED;
  }
  if (error instanceof RateLimitError) {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
  if (error instanceof NotFoundError) {
    return HttpStatus.NOT_FOUND;
  }
  if (error instanceof ConflictError) {
    return HttpStatus.CONFLICT;
  }
  if (error instanceof ValidationError || error instanceof BusinessRuleError) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.BAD_REQUEST;
}

/**
 * Convert DomainError to appropriate NestJS HTTP exception.
 * Includes errorCode and details in the exception response body
 * so the GlobalExceptionFilter can propagate them to the client.
 */
export function domainErrorToHttpException(error: DomainError): never {
  const status = getHttpStatus(error);

  throw new HttpException(
    {
      message: error.message,
      errorCode: error.code ?? 'UNKNOWN_ERROR',
      details: error.details,
    },
    status
  );
}

/**
 * Convert Result to HTTP response
 * Returns the value if ok, throws HTTP exception if error
 */
export function resultToHttpResponse<T>(result: Result<T, DomainError>): T | never {
  return result.match(
    value => value,
    error => {
      throw domainErrorToHttpException(error);
    }
  );
}
