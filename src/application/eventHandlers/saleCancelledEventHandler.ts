import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class SaleCancelledEventHandler implements IDomainEventHandler<SaleCancelledEvent> {
  private readonly logger = new Logger(SaleCancelledEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: SaleCancelledEvent): Promise<void> {
    this.logger.log('Handling SaleCancelled event', {
      saleId: event.saleId,
      saleNumber: event.saleNumber,
      orgId: event.orgId,
      reason: event.reason,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Sale'),
        AuditAction.create('CANCEL'),
        this.auditRepository,
        {
          entityId: event.saleId,
          orgId: event.orgId,
          additionalMetadata: {
            saleNumber: event.saleNumber,
            reason: event.reason,
          },
        }
      );

      this.logger.log('Sale cancellation audit logged successfully', {
        saleId: event.saleId,
        saleNumber: event.saleNumber,
      });
    } catch (error) {
      this.logger.error('Error handling SaleCancelled event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        saleId: event.saleId,
        saleNumber: event.saleNumber,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
