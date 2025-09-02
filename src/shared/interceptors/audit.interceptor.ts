import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import type { IAuthenticatedUser, IOrganizationContext } from '@shared/types/http.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params } = request;
    const user = request.user as IAuthenticatedUser | undefined;
    const organization = request.organization as IOrganizationContext | undefined;
    const startTime = Date.now();

    // Log de inicio de operación
    this.logger.log(
      `[AUDIT] ${method} ${url} - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'}`
    );

    // Log de detalles de la operación
    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`[AUDIT] Request Body: ${JSON.stringify(body)}`);
    }

    if (query && Object.keys(query).length > 0) {
      this.logger.debug(`[AUDIT] Query Params: ${JSON.stringify(query)}`);
    }

    if (params && Object.keys(params).length > 0) {
      this.logger.debug(`[AUDIT] Path Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap(response => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de éxito
        this.logger.log(
          `[AUDIT] ${method} ${url} - SUCCESS - Duration: ${duration}ms - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'}`
        );

        // Log de respuesta (solo en debug)
        if (response && typeof response === 'object') {
          this.logger.debug(`[AUDIT] Response: ${JSON.stringify(response)}`);
        }
      }),
      catchError(error => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log de error
        this.logger.error(
          `[AUDIT] ${method} ${url} - ERROR - Duration: ${duration}ms - User: ${user?.id || 'anonymous'} - Org: ${organization?.id || 'unknown'} - Error: ${error.message}`
        );

        // Log de stack trace en debug
        if (error.stack) {
          this.logger.debug(`[AUDIT] Error Stack: ${error.stack}`);
        }

        throw error;
      })
    );
  }
}
