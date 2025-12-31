import { Injectable, LoggerService } from '@nestjs/common';
import { Request } from 'express';

/**
 * Structured Logger Service
 *
 * Provides structured JSON logging with correlation IDs and context.
 * Integrates with NestJS Logger for consistent logging across the application.
 */
@Injectable()
export class StructuredLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log with structured format including correlation ID
   */
  log(message: string, context?: string | object, request?: Request) {
    const logData = this.buildLogData('info', message, context, request);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logData));
  }

  error(message: string, trace?: string, context?: string | object, request?: Request) {
    const logData = this.buildLogData('error', message, context, request, trace);
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(logData));
  }

  warn(message: string, context?: string | object, request?: Request) {
    const logData = this.buildLogData('warn', message, context, request);
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(logData));
  }

  debug(message: string, context?: string | object, request?: Request) {
    const logData = this.buildLogData('debug', message, context, request);
    // eslint-disable-next-line no-console
    console.debug(JSON.stringify(logData));
  }

  verbose(message: string, context?: string | object, request?: Request) {
    const logData = this.buildLogData('verbose', message, context, request);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logData));
  }

  private buildLogData(
    level: string,
    message: string,
    context?: string | object,
    request?: Request,
    trace?: string
  ): Record<string, unknown> {
    const logData: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    // Add context
    if (this.context) {
      logData.context = this.context;
    }

    // Add request context (correlation ID, user, orgId)
    if (request) {
      logData.correlationId = request.correlationId;
      if (request.user) {
        logData.userId = (request.user as { id?: string }).id;
        logData.orgId = (request.user as { orgId?: string }).orgId;
      }
      if (request.orgId) {
        logData.orgId = request.orgId;
      }
      logData.method = request.method;
      logData.path = request.path;
    }

    // Add additional context (can be object or string)
    if (context) {
      if (typeof context === 'string') {
        logData.additionalContext = context;
      } else {
        Object.assign(logData, context);
      }
    }

    // Add trace for errors
    if (trace) {
      logData.trace = trace;
    }

    return logData;
  }
}
