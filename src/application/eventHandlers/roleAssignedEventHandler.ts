import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

@Injectable()
export class RoleAssignedEventHandler implements IDomainEventHandler<RoleAssignedEvent> {
  private readonly logger = new Logger(RoleAssignedEventHandler.name);

  async handle(event: RoleAssignedEvent): Promise<void> {
    this.logger.log('Handling RoleAssigned event', {
      userId: event.userId,
      roleId: event.roleId,
      roleName: event.roleName,
      assignedBy: event.assignedBy,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      // TODO: Create audit log entry when AuditLog table is added to schema
      // For now, we log the event for audit purposes
      this.logger.log('[AUDIT] Role assigned', {
        entityType: 'User',
        entityId: event.userId,
        action: 'ROLE_ASSIGNED',
        performedBy: event.assignedBy,
        orgId: event.orgId,
        metadata: {
          roleId: event.roleId,
          roleName: event.roleName,
          assignedAt: event.occurredOn.toISOString(),
        },
      });

      this.logger.log('Role assignment audit logged successfully', {
        userId: event.userId,
        roleName: event.roleName,
      });
    } catch (error) {
      this.logger.error('Error handling RoleAssigned event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: event.userId,
        roleId: event.roleId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
