import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleConfirmedEvent } from '@sale/domain/events/saleConfirmed.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class SaleConfirmedEventHandler implements IDomainEventHandler<SaleConfirmedEvent> {
  private readonly logger = new Logger(SaleConfirmedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: SaleConfirmedEvent): Promise<void> {
    this.logger.log('Handling SaleConfirmed event', {
      saleId: event.saleId,
      saleNumber: event.saleNumber,
      movementId: event.movementId,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Sale'),
        AuditAction.create('CONFIRM'),
        this.auditRepository,
        {
          entityId: event.saleId,
          orgId: event.orgId,
          additionalMetadata: {
            saleNumber: event.saleNumber,
            movementId: event.movementId,
            warehouseId: event.warehouseId,
          },
        }
      );

      this.logger.log('Sale confirmation audit logged successfully', {
        saleId: event.saleId,
        saleNumber: event.saleNumber,
        movementId: event.movementId,
      });
    } catch (error) {
      this.logger.error('Error handling SaleConfirmed event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        saleId: event.saleId,
        saleNumber: event.saleNumber,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
