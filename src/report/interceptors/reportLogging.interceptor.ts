import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import type { IAuthenticatedUser } from '@shared/types/http.types';

export interface IReportLogMetadata {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logCacheHits: boolean;
  logParameters: boolean; // Whether to log report parameters (may contain sensitive data)
}

@Injectable()
export class ReportLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReportLoggingInterceptor.name);
  private readonly metadata: IReportLogMetadata;

  constructor(@Optional() private readonly configService: ConfigService) {
    this.metadata = this.getInterceptorMetadata();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Get metadata
    if (!this.metadata.enabled) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user as IAuthenticatedUser | undefined;

    // Extract report information from request
    const reportType = this.extractReportType(request);
    const reportFormat = this.extractReportFormat(request);
    const isExport = url.includes('/export');
    const isView = url.includes('/view');

    // Log start of report operation
    this.logReportEvent(
      'start',
      {
        method,
        url,
        ip,
        userId: user?.id || 'anonymous',
        orgId: user?.orgId || 'unknown',
        reportType,
        reportFormat,
        isExport,
        isView,
        timestamp: new Date().toISOString(),
      },
      this.metadata.logLevel
    );

    return next.handle().pipe(
      tap(async response => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Extract cache information from response if available
        const fromCache = (response as { fromCache?: boolean })?.fromCache || false;
        const data = (response as { data?: unknown })?.data;
        const size = this.calculateResponseSize(data);

        // Log success
        this.logReportEvent(
          'success',
          {
            method,
            url,
            statusCode: 200,
            duration,
            userId: user?.id || 'anonymous',
            orgId: user?.orgId || 'unknown',
            reportType,
            reportFormat,
            isExport,
            isView,
            fromCache: this.metadata.logCacheHits ? fromCache : undefined,
            size: isExport ? size : undefined,
            timestamp: new Date().toISOString(),
          },
          this.metadata.logLevel
        );
      }),
      catchError(async error => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log error
        this.logReportEvent(
          'error',
          {
            method,
            url,
            statusCode: error.status || 500,
            duration,
            userId: user?.id || 'anonymous',
            orgId: user?.orgId || 'unknown',
            reportType,
            reportFormat,
            isExport,
            isView,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          'error'
        );

        throw error;
      })
    );
  }

  private extractReportType(request: Request): string | undefined {
    // Try to get from query params
    if (request.query?.type) {
      return request.query.type as string;
    }

    // Try to get from body
    if (request.body?.type) {
      return request.body.type as string;
    }

    // Try to extract from URL
    const urlMatch = request.url.match(/\/([^/]+)\/(view|export)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    return undefined;
  }

  private extractReportFormat(request: Request): string | undefined {
    // Try to get from query params
    if (request.query?.format) {
      return request.query.format as string;
    }

    // Try to get from body
    if (request.body?.format) {
      return request.body.format as string;
    }

    return undefined;
  }

  private calculateResponseSize(data: unknown): number {
    if (!data) {
      return 0;
    }

    try {
      if (Buffer.isBuffer(data)) {
        return data.length;
      }

      if (typeof data === 'object') {
        return JSON.stringify(data).length;
      }

      return String(data).length;
    } catch {
      return 0;
    }
  }

  private logReportEvent(
    event: 'start' | 'success' | 'error',
    metadata: Record<string, unknown>,
    level: 'debug' | 'info' | 'warn' | 'error'
  ): void {
    const logMessage = `[REPORT] ${metadata.method} ${metadata.url} - ${event.toUpperCase()}`;
    const logContext = {
      ...metadata,
      event,
    };

    switch (level) {
      case 'debug':
        this.logger.debug(logMessage, logContext);
        break;
      case 'info':
        this.logger.log(logMessage, logContext);
        break;
      case 'warn':
        this.logger.warn(logMessage, logContext);
        break;
      case 'error':
        this.logger.error(logMessage, logContext);
        break;
    }
  }

  private getInterceptorMetadata(): IReportLogMetadata {
    const enabled = this.configService?.get<boolean>('REPORT_LOGGING_ENABLED', true) ?? true;
    const logLevel =
      (this.configService?.get<'debug' | 'info' | 'warn' | 'error'>(
        'REPORT_LOGGING_LEVEL',
        'info'
      ) as 'debug' | 'info' | 'warn' | 'error') || 'info';
    const logCacheHits =
      this.configService?.get<boolean>('REPORT_LOGGING_CACHE_HITS', true) ?? true;
    const logParameters =
      this.configService?.get<boolean>('REPORT_LOGGING_PARAMETERS', false) ?? false;

    return {
      enabled,
      logLevel,
      logCacheHits,
      logParameters,
    };
  }
}
