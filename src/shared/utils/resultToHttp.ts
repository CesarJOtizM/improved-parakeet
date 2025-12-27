// Result to HTTP Response Utility
// Converts Result<T, DomainError> to HTTP responses or throws appropriate exceptions

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
 * Convert DomainError to appropriate NestJS HTTP exception
 */
export function domainErrorToHttpException(error: DomainError): never {
  // Auth-specific errors - security-safe messages
  if (error instanceof AuthenticationError) {
    throw new UnauthorizedException(error.message);
  }

  if (error instanceof TokenError) {
    throw new UnauthorizedException(error.message);
  }

  if (error instanceof RateLimitError) {
    throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
  }

  // Standard domain errors
  if (error instanceof NotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof ConflictError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ValidationError || error instanceof BusinessRuleError) {
    throw new BadRequestException(error.message);
  }

  // Default to BadRequestException for unknown domain errors
  throw new BadRequestException(error.message);
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
