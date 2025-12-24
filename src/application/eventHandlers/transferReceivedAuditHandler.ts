import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { TransferReceivedEvent } from '@transfer/domain/events/transferReceived.event';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class TransferReceivedAuditHandler implements IDomainEventHandler<TransferReceivedEvent> {
  private readonly logger = new Logger(TransferReceivedAuditHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: TransferReceivedEvent): Promise<void> {
    this.logger.log('Handling TransferReceived audit event', {
      transferId: event.transferId,
      fromWarehouseId: event.fromWarehouseId,
      toWarehouseId: event.toWarehouseId,
      orgId: event.orgId,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Transfer'),
        AuditAction.create('RECEIVE'),
        this.auditRepository,
        {
          entityId: event.transferId,
          orgId: event.orgId,
          additionalMetadata: {
            fromWarehouseId: event.fromWarehouseId,
            toWarehouseId: event.toWarehouseId,
            totalQuantity: event.totalQuantity,
          },
        }
      );

      this.logger.log('Transfer received audit logged successfully', {
        transferId: event.transferId,
      });
    } catch (error) {
      this.logger.error('Error handling TransferReceived audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferId: event.transferId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
