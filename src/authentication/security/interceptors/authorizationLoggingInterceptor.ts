import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { IAuthenticatedUser } from '@shared/types/http.types';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface IAuthorizationLogMetadata {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logPermissions: boolean;
  logRoles: boolean;
}

@Injectable()
export class AuthorizationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthorizationLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Obtener metadatos del interceptor
    const metadata = this.getInterceptorMetadata();

    if (!metadata.enabled) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user as IAuthenticatedUser | undefined;

    // Log de inicio de operación de autorización
    this.logAuthorizationEvent(
      'start',
      {
        method,
        url,
        ip,
        userId: user?.id || 'anonymous',
        orgId: user?.orgId || 'unknown',
        timestamp: new Date().toISOString(),
        roles: metadata.logRoles ? user?.roles || [] : [],
        permissions: metadata.logPermissions ? user?.permissions || [] : [],
      },
      metadata.logLevel
    );

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de éxito de autorización
        this.logAuthorizationEvent(
          'success',
          {
            method,
            url,
            ip,
            userId: user?.id || 'anonymous',
            orgId: user?.orgId || 'unknown',
            duration,
            timestamp: new Date().toISOString(),
            accessGranted: true,
          },
          metadata.logLevel
        );
      }),
      catchError(error => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de error de autorización
        this.logAuthorizationEvent(
          'error',
          {
            method,
            url,
            ip,
            userId: user?.id || 'anonymous',
            orgId: user?.orgId || 'unknown',
            duration,
            timestamp: new Date().toISOString(),
            error: error.message,
            statusCode: error.status || 500,
            accessGranted: false,
            failureReason: this.extractFailureReason(error),
          },
          metadata.logLevel
        );

        throw error;
      })
    );
  }

  private getInterceptorMetadata(): IAuthorizationLogMetadata {
    // Por defecto, habilitar logging para todas las operaciones de autorización
    return {
      enabled: true,
      logLevel: 'info',
      logPermissions: false, // Por seguridad, no logear permisos por defecto
      logRoles: true, // Logear roles es menos sensible
    };
  }

  private extractFailureReason(error: Error): string {
    if (error.message.includes('Insufficient role permissions')) {
      return 'INSUFFICIENT_ROLES';
    }
    if (error.message.includes('Insufficient permissions')) {
      return 'INSUFFICIENT_PERMISSIONS';
    }
    if (error.message.includes('Access denied to this organization')) {
      return 'ORGANIZATION_ACCESS_DENIED';
    }
    if (error.message.includes('User authentication required')) {
      return 'AUTHENTICATION_REQUIRED';
    }
    return 'UNKNOWN';
  }

  private logAuthorizationEvent(
    eventType: 'start' | 'success' | 'error',
    data: Record<string, unknown>,
    level: 'debug' | 'info' | 'warn' | 'error'
  ): void {
    const message = `[AUTHZ_LOG] ${eventType.toUpperCase()} - ${data.method} ${data.url}`;

    switch (level) {
      case 'debug':
        this.logger.debug(message, data);
        break;
      case 'info':
        this.logger.log(message, data);
        break;
      case 'warn':
        this.logger.warn(message, data);
        break;
      case 'error':
        this.logger.error(message, data);
        break;
    }
  }
}
