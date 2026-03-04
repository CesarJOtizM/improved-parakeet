import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleLineSwappedEvent } from '@sale/domain/events/saleLineSwapped.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class SaleLineSwappedEventHandler implements IDomainEventHandler<SaleLineSwappedEvent> {
  private readonly logger = new Logger(SaleLineSwappedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: SaleLineSwappedEvent): Promise<void> {
    this.logger.log('Handling SaleLineSwapped event', {
      saleId: event.saleId,
      saleNumber: event.saleNumber,
      swapId: event.swapId,
      orgId: event.orgId,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Sale'),
        AuditAction.create('SWAP'),
        this.auditRepository,
        {
          entityId: event.saleId,
          orgId: event.orgId,
          additionalMetadata: {
            saleNumber: event.saleNumber,
            swapId: event.swapId,
            originalProductId: event.originalProductId,
            replacementProductId: event.replacementProductId,
            swapQuantity: event.swapQuantity,
            sourceWarehouseId: event.sourceWarehouseId,
            warehouseId: event.warehouseId,
            performedBy: event.performedBy,
          },
        }
      );

      this.logger.log('Sale line swap audit logged successfully', {
        saleId: event.saleId,
        swapId: event.swapId,
      });
    } catch (error) {
      this.logger.error('Error handling SaleLineSwapped event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        saleId: event.saleId,
        swapId: event.swapId,
      });
    }
  }
}
