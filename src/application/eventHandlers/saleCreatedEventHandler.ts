import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleCreatedEvent } from '@sale/domain/events/saleCreated.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class SaleCreatedEventHandler implements IDomainEventHandler<SaleCreatedEvent> {
  private readonly logger = new Logger(SaleCreatedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: SaleCreatedEvent): Promise<void> {
    this.logger.log('Handling SaleCreated event', {
      saleId: event.saleId,
      saleNumber: event.saleNumber,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Sale'),
        AuditAction.create('CREATE'),
        this.auditRepository,
        {
          entityId: event.saleId,
          orgId: event.orgId,
          additionalMetadata: {
            saleNumber: event.saleNumber,
            warehouseId: event.warehouseId,
          },
        }
      );

      this.logger.log('Sale creation audit logged successfully', {
        saleId: event.saleId,
        saleNumber: event.saleNumber,
      });
    } catch (error) {
      this.logger.error('Error handling SaleCreated event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        saleId: event.saleId,
        saleNumber: event.saleNumber,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
