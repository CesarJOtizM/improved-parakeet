import { PermissionChangedEvent } from '@auth/domain/events/permissionChanged.event';
import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

@Injectable()
export class PermissionChangedEventHandler implements IDomainEventHandler<PermissionChangedEvent> {
  private readonly logger = new Logger(PermissionChangedEventHandler.name);

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
      // TODO: Create audit log entry when AuditLog table is added to schema
      // For now, we log the event for audit purposes
      this.logger.log('[AUDIT] Permission changed', {
        entityType: 'Permission',
        entityId: event.permissionId,
        action: `PERMISSION_${event.changeType}`,
        performedBy: event.changedBy,
        orgId: event.orgId,
        metadata: {
          permissionName: event.permissionName,
          module: event.module,
          action: event.action,
          changeType: event.changeType,
          changedAt: event.occurredOn.toISOString(),
        },
      });

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
