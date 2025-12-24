import { MovementVoidedEvent } from '@movement/domain/events/movementVoided.event';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class MovementVoidedAuditHandler implements IDomainEventHandler<MovementVoidedEvent> {
  private readonly logger = new Logger(MovementVoidedAuditHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: MovementVoidedEvent): Promise<void> {
    this.logger.log('Handling MovementVoided audit event', {
      movementId: event.movementId,
      orgId: event.orgId,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Movement'),
        AuditAction.create('VOID'),
        this.auditRepository,
        {
          entityId: event.movementId,
          orgId: event.orgId,
          additionalMetadata: {
            type: event.type,
            warehouseId: event.warehouseId,
          },
        }
      );

      this.logger.log('Movement voided audit logged successfully', {
        movementId: event.movementId,
      });
    } catch (error) {
      this.logger.error('Error handling MovementVoided audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId: event.movementId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
