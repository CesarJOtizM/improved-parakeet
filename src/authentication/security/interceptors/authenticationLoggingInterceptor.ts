import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/types/http.types';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AuthenticationLogMetadata {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeSensitiveData: boolean;
}

@Injectable()
export class AuthenticationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthenticationLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Obtener metadatos del interceptor
    const metadata = this.getInterceptorMetadata();

    if (!metadata.enabled) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user as AuthenticatedUser | undefined;

    // Log de inicio de operación de autenticación
    this.logAuthenticationEvent(
      'start',
      {
        method,
        url,
        ip,
        userId: user?.id || 'anonymous',
        orgId: user?.orgId || 'unknown',
        timestamp: new Date().toISOString(),
      },
      metadata.logLevel
    );

    return next.handle().pipe(
      tap(response => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de éxito de autenticación
        this.logAuthenticationEvent(
          'success',
          {
            method,
            url,
            ip,
            userId: user?.id || 'anonymous',
            orgId: user?.orgId || 'unknown',
            duration,
            timestamp: new Date().toISOString(),
            response: metadata.includeSensitiveData ? response : '***',
          },
          metadata.logLevel
        );
      }),
      catchError(error => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de error de autenticación
        this.logAuthenticationEvent(
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
          },
          metadata.logLevel
        );

        throw error;
      })
    );
  }

  private getInterceptorMetadata(): AuthenticationLogMetadata {
    // Por defecto, habilitar logging para todas las operaciones de autenticación
    return {
      enabled: true,
      logLevel: 'info',
      includeSensitiveData: false,
    };
  }

  private logAuthenticationEvent(
    eventType: 'start' | 'success' | 'error',
    data: Record<string, unknown>,
    level: 'debug' | 'info' | 'warn' | 'error'
  ): void {
    const message = `[AUTH_LOG] ${eventType.toUpperCase()} - ${data.method} ${data.url}`;

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
