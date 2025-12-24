import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { TransferInitiatedEvent } from '@transfer/domain/events/transferInitiated.event';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class TransferInitiatedAuditHandler implements IDomainEventHandler<TransferInitiatedEvent> {
  private readonly logger = new Logger(TransferInitiatedAuditHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: TransferInitiatedEvent): Promise<void> {
    this.logger.log('Handling TransferInitiated audit event', {
      transferId: event.transferId,
      fromWarehouseId: event.fromWarehouseId,
      toWarehouseId: event.toWarehouseId,
      orgId: event.orgId,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Transfer'),
        AuditAction.create('INITIATE'),
        this.auditRepository,
        {
          entityId: event.transferId,
          orgId: event.orgId,
          additionalMetadata: {
            fromWarehouseId: event.fromWarehouseId,
            toWarehouseId: event.toWarehouseId,
            totalQuantity: event.totalQuantity,
            linesCount: event.lines,
          },
        }
      );

      this.logger.log('Transfer initiated audit logged successfully', {
        transferId: event.transferId,
      });
    } catch (error) {
      this.logger.error('Error handling TransferInitiated audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferId: event.transferId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
