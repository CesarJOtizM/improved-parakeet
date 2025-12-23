import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class RoleAssignedEventHandler implements IDomainEventHandler<RoleAssignedEvent> {
  private readonly logger = new Logger(RoleAssignedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

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
      await AuditService.logEvent(
        event,
        EntityType.create('User'),
        AuditAction.create('ASSIGN_ROLE'),
        this.auditRepository,
        {
          entityId: event.userId,
          performedBy: event.assignedBy,
          orgId: event.orgId,
          additionalMetadata: {
            roleId: event.roleId,
            roleName: event.roleName,
          },
        }
      );

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
