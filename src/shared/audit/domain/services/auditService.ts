import { Logger } from '@nestjs/common';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export interface ILogActionParams {
  entityType: EntityType;
  entityId?: string;
  action: AuditAction;
  performedBy?: string;
  orgId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ILogHttpRequestParams {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  performedBy?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: unknown;
  responseBody?: unknown;
}

export class AuditService {
  private static readonly logger = new Logger(AuditService.name);
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
  ];

  /**
   * Log a domain action
   */
  public static async logAction(
    params: ILogActionParams,
    repository: IAuditLogRepository
  ): Promise<void> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata || {});

      const auditLog = AuditLog.create(
        {
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          performedBy: params.performedBy,
          metadata: AuditMetadata.create(sanitizedMetadata),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
        params.orgId
      );

      // Async processing - don't block the main flow
      setImmediate(async () => {
        try {
          await repository.save(auditLog);
        } catch (error) {
          // Log error but don't throw - audit failures shouldn't break main flow
          AuditService.logger.error('Failed to save audit log', error);
        }
      });
    } catch (error) {
      // Log error but don't throw
      AuditService.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Log a domain event
   */
  public static async logEvent(
    event: DomainEvent,
    entityType: EntityType,
    action: AuditAction,
    repository: IAuditLogRepository,
    options?: {
      entityId?: string;
      performedBy?: string;
      orgId?: string;
      ipAddress?: string;
      userAgent?: string;
      additionalMetadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      const metadata: Record<string, unknown> = {
        eventName: event.eventName,
        occurredOn: event.occurredOn.toISOString(),
        ...options?.additionalMetadata,
      };

      // Extract orgId from event if available
      const orgId = options?.orgId || (event as { orgId?: string }).orgId || undefined;

      await this.logAction(
        {
          entityType,
          entityId: options?.entityId,
          action,
          performedBy: options?.performedBy,
          orgId,
          metadata,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
        repository
      );
    } catch (error) {
      AuditService.logger.error('Failed to log domain event', error);
    }
  }

  /**
   * Log an HTTP request
   */
  public static async logHttpRequest(
    params: ILogHttpRequestParams,
    repository: IAuditLogRepository
  ): Promise<void> {
    try {
      const sanitizedRequestBody = this.sanitizeData(params.requestBody);
      const sanitizedResponseBody = this.sanitizeData(params.responseBody);

      const metadata: Record<string, unknown> = {
        requestBody: sanitizedRequestBody,
        responseBody: sanitizedResponseBody,
      };

      const auditLog = AuditLog.create(
        {
          entityType: EntityType.create('System'),
          action: AuditAction.create('HTTP_REQUEST'),
          performedBy: params.performedBy,
          metadata: AuditMetadata.create(metadata),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          httpMethod: params.method,
          httpUrl: params.url,
          httpStatusCode: params.statusCode,
          duration: params.duration,
        },
        params.orgId
      );

      // Async processing
      setImmediate(async () => {
        try {
          await repository.save(auditLog);
        } catch (error) {
          AuditService.logger.error('Failed to save HTTP request audit log', error);
        }
      });
    } catch (error) {
      AuditService.logger.error('Failed to log HTTP request', error);
    }
  }

  /**
   * Log an error
   */
  public static async logError(
    error: Error,
    context: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      orgId?: string;
      ipAddress?: string;
      userAgent?: string;
      additionalMetadata?: Record<string, unknown>;
    },
    repository: IAuditLogRepository
  ): Promise<void> {
    try {
      const metadata: Record<string, unknown> = {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        ...context.additionalMetadata,
      };

      const auditLog = AuditLog.create(
        {
          entityType: context.entityType || EntityType.create('System'),
          entityId: context.entityId,
          action: context.action || AuditAction.create('SYSTEM_ACTION'),
          performedBy: context.performedBy,
          metadata: AuditMetadata.create(metadata),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        context.orgId
      );

      // Async processing
      setImmediate(async () => {
        try {
          await repository.save(auditLog);
        } catch (err) {
          AuditService.logger.error('Failed to save error audit log', err);
        }
      });
    } catch (err) {
      AuditService.logger.error('Failed to log error', err);
    }
  }

  /**
   * Sanitize metadata by removing sensitive fields
   */
  private static sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();

      // Skip sensitive fields
      if (this.SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null && !(item instanceof Date)
            ? this.sanitizeMetadata(item as Record<string, unknown>)
            : item
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize data (for request/response bodies)
   */
  private static sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    return this.sanitizeMetadata(data as Record<string, unknown>);
  }
}
