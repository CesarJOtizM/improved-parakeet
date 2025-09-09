import { Request } from 'express';

export interface IAuthenticatedRequest extends Request {
  user: IAuthenticatedUser;
}

export interface IAuthenticatedUser {
  id: string;
  orgId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  jti: string;
}

export interface IRateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Blocked'?: string;
  'X-RateLimit-Block-Expires'?: string;
}

export interface IErrorResponse {
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export interface IValidationErrorResponse extends IErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}
