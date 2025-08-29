import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  orgId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  jti: string;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Blocked'?: string;
  'X-RateLimit-Block-Expires'?: string;
}

export interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}
