import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { LocationAddedEvent } from '@warehouse/domain/events/locationAdded.event';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class LocationAddedEventHandler implements IDomainEventHandler<LocationAddedEvent> {
  private readonly logger = new Logger(LocationAddedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: LocationAddedEvent): Promise<void> {
    this.logger.log('Handling LocationAdded event', {
      locationId: event.locationId,
      warehouseId: event.warehouseId,
      code: event.code,
      name: event.name,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Location'),
        AuditAction.create('CREATE'),
        this.auditRepository,
        {
          entityId: event.locationId,
          orgId: event.orgId,
          additionalMetadata: {
            warehouseId: event.warehouseId,
            code: event.code,
            name: event.name,
          },
        }
      );

      this.logger.log('Location addition audit logged successfully', {
        locationId: event.locationId,
        code: event.code,
      });
    } catch (error) {
      this.logger.error('Error handling LocationAdded event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId: event.locationId,
        code: event.code,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
