import { PermissionChangedEvent } from '@auth/domain/events/permissionChanged.event';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class PermissionChangedEventHandler implements IDomainEventHandler<PermissionChangedEvent> {
  private readonly logger = new Logger(PermissionChangedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: PermissionChangedEvent): Promise<void> {
    this.logger.log('Handling PermissionChanged event', {
      permissionId: event.permissionId,
      permissionName: event.permissionName,
      changeType: event.changeType,
      changedBy: event.changedBy,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Permission'),
        AuditAction.create('PERMISSION_CHANGED'),
        this.auditRepository,
        {
          entityId: event.permissionId,
          performedBy: event.changedBy,
          orgId: event.orgId,
          additionalMetadata: {
            permissionName: event.permissionName,
            module: event.module,
            action: event.action,
            changeType: event.changeType,
          },
        }
      );

      this.logger.log('Permission change audit logged successfully', {
        permissionId: event.permissionId,
        changeType: event.changeType,
      });
    } catch (error) {
      this.logger.error('Error handling PermissionChanged event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId: event.permissionId,
        changeType: event.changeType,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
