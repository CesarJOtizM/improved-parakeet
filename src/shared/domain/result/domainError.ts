// Domain Error Types - Base classes for domain errors
// Used as error types in Result<T, E> pattern

export abstract class DomainError extends Error {
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, code = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}

export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    code = 'BUSINESS_RULE_VIOLATION',
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
  }
}

// Auth-specific errors with security-safe messages
// These errors intentionally use generic messages to prevent information disclosure

/**
 * Generic authentication error - used for all auth failures
 * SECURITY: Same message for user not found, wrong password, account locked, etc.
 */
export class AuthenticationError extends DomainError {
  public readonly internalReason?: string;

  constructor(internalReason?: string) {
    super('Authentication failed', 'AUTHENTICATION_ERROR');
    // internalReason is for internal logging only, never exposed to client
    this.internalReason = internalReason;
  }
}

/**
 * Token error - used for all token-related failures
 * SECURITY: Same message for expired, invalid, revoked, or blacklisted tokens
 */
export class TokenError extends DomainError {
  public readonly internalReason?: string;

  constructor(internalReason?: string) {
    super('Invalid or expired token', 'TOKEN_ERROR');
    this.internalReason = internalReason;
  }
}

/**
 * Rate limit error - safe to expose as it doesn't reveal sensitive info
 */
export class RateLimitError extends DomainError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 'RATE_LIMIT_EXCEEDED');
  }
}
