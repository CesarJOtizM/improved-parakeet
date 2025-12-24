import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class MovementPostedAuditHandler implements IDomainEventHandler<MovementPostedEvent> {
  private readonly logger = new Logger(MovementPostedAuditHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: MovementPostedEvent): Promise<void> {
    this.logger.log('Handling MovementPosted audit event', {
      movementId: event.movementId,
      type: event.type,
      warehouseId: event.warehouseId,
      orgId: event.orgId,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Movement'),
        AuditAction.create('POST'),
        this.auditRepository,
        {
          entityId: event.movementId,
          orgId: event.orgId,
          additionalMetadata: {
            type: event.type,
            warehouseId: event.warehouseId,
            totalQuantity: event.totalQuantity,
            linesCount: event.lines,
          },
        }
      );

      this.logger.log('Movement posted audit logged successfully', {
        movementId: event.movementId,
      });
    } catch (error) {
      this.logger.error('Error handling MovementPosted audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId: event.movementId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
