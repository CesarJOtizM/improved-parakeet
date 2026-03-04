import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Inject,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import type { IAuthenticatedUser, IOrganizationContext } from '@shared/types/http.types';

const SENSITIVE_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'otpCode',
  'otp',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'apiKey',
  'authorization',
]);

function redactSensitiveFields(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveFields);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params } = request;
    const user = request.user as IAuthenticatedUser | undefined;
    const organization = request.organization as IOrganizationContext | undefined;
    const startTime = Date.now();

    // Get IP address and user agent
    const ipAddress =
      request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress || undefined;
    const userAgent = request.headers['user-agent'] || undefined;

    // Log de inicio de operación
    this.logger.debug(
      `[AUDIT] ${method} ${url} - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'}`
    );

    return next.handle().pipe(
      tap(async response => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de éxito
        this.logger.debug(
          `[AUDIT] ${method} ${url} - SUCCESS - Duration: ${duration}ms - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'}`
        );

        // Log HTTP request to audit system
        await AuditService.logHttpRequest(
          {
            method,
            url,
            statusCode: 200, // Success
            duration,
            performedBy: user?.id,
            orgId: organization?.id,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent,
            requestBody: redactSensitiveFields({ body, query, params }),
            responseBody: redactSensitiveFields(response),
          },
          this.auditRepository
        );
      }),
      catchError(async error => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de error
        this.logger.error(
          `[AUDIT] ${method} ${url} - ERROR - Duration: ${duration}ms - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'} - Error: ${error.message}`
        );

        // Log HTTP request error to audit system
        await AuditService.logHttpRequest(
          {
            method,
            url,
            statusCode: error.status || 500,
            duration,
            performedBy: user?.id,
            orgId: organization?.id,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent,
            requestBody: redactSensitiveFields({ body, query, params }),
            responseBody: { error: error.message },
          },
          this.auditRepository
        );

        throw error;
      })
    );
  }
}
