import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
import { EmailService } from '@infrastructure/externalServices';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import type { IUserRepository } from '@auth/domain/repositories';

@Injectable()
export class UserStatusChangedEventHandler implements IDomainEventHandler<UserStatusChangedEvent> {
  private readonly logger = new Logger(UserStatusChangedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository,
    @Inject('UserRepository')
    private readonly userRepository: IUserRepository,
    private readonly emailService: EmailService
  ) {}

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
      await AuditService.logEvent(
        event,
        EntityType.create('User'),
        AuditAction.create('STATUS_CHANGED'),
        this.auditRepository,
        {
          entityId: event.userId,
          performedBy: event.changedBy,
          orgId: event.orgId,
          additionalMetadata: {
            oldStatus: event.oldStatus,
            newStatus: event.newStatus,
            reason: event.reason,
          },
        }
      );

      this.logger.log('User status change audit logged successfully', {
        userId: event.userId,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      });

      // Send deactivation email when user is deactivated
      if (event.newStatus === 'INACTIVE') {
        try {
          const user = await this.userRepository.findById(event.userId, event.orgId);
          if (user) {
            await this.emailService.sendAccountDeactivationEmail(
              user.email,
              user.firstName,
              user.lastName,
              event.orgId,
              event.reason
            );
            this.logger.log('Deactivation email sent', { userId: event.userId });
          }
        } catch (emailError) {
          this.logger.warn('Failed to send deactivation email', {
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            userId: event.userId,
          });
        }
      }
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
