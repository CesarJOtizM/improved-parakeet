import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

@Injectable()
export class UserStatusChangedEventHandler implements IDomainEventHandler<UserStatusChangedEvent> {
  private readonly logger = new Logger(UserStatusChangedEventHandler.name);

  async handle(event: UserStatusChangedEvent): Promise<void> {
    this.logger.log('Handling UserStatusChanged event', {
      userId: event.userId,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      changedBy: event.changedBy,
      orgId: event.orgId,
      reason: event.reason,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      // TODO: Create audit log entry when AuditLog table is added to schema
      // For now, we log the event for audit purposes
      this.logger.log('[AUDIT] User status changed', {
        entityType: 'User',
        entityId: event.userId,
        action: 'STATUS_CHANGED',
        performedBy: event.changedBy,
        orgId: event.orgId,
        metadata: {
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
          reason: event.reason,
          changedAt: event.occurredOn.toISOString(),
        },
      });

      this.logger.log('User status change audit logged successfully', {
        userId: event.userId,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      });
    } catch (error) {
      this.logger.error('Error handling UserStatusChanged event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: event.userId,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
