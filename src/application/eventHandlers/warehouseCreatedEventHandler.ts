import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { WarehouseCreatedEvent } from '@warehouse/domain/events/warehouseCreated.event';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class WarehouseCreatedEventHandler implements IDomainEventHandler<WarehouseCreatedEvent> {
  private readonly logger = new Logger(WarehouseCreatedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: WarehouseCreatedEvent): Promise<void> {
    this.logger.log('Handling WarehouseCreated event', {
      warehouseId: event.warehouseId,
      code: event.code,
      name: event.name,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Warehouse'),
        AuditAction.create('CREATE'),
        this.auditRepository,
        {
          entityId: event.warehouseId,
          orgId: event.orgId,
          additionalMetadata: {
            code: event.code,
            name: event.name,
          },
        }
      );

      this.logger.log('Warehouse creation audit logged successfully', {
        warehouseId: event.warehouseId,
        code: event.code,
      });
    } catch (error) {
      this.logger.error('Error handling WarehouseCreated event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        warehouseId: event.warehouseId,
        code: event.code,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
