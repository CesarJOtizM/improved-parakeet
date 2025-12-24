import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { TransferRejectedEvent } from '@transfer/domain/events/transferRejected.event';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class TransferRejectedAuditHandler implements IDomainEventHandler<TransferRejectedEvent> {
  private readonly logger = new Logger(TransferRejectedAuditHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: TransferRejectedEvent): Promise<void> {
    this.logger.log('Handling TransferRejected audit event', {
      transferId: event.transferId,
      fromWarehouseId: event.fromWarehouseId,
      toWarehouseId: event.toWarehouseId,
      orgId: event.orgId,
      rejectionReason: event.rejectionReason,
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Transfer'),
        AuditAction.create('REJECT'),
        this.auditRepository,
        {
          entityId: event.transferId,
          orgId: event.orgId,
          additionalMetadata: {
            fromWarehouseId: event.fromWarehouseId,
            toWarehouseId: event.toWarehouseId,
            rejectionReason: event.rejectionReason,
          },
        }
      );

      this.logger.log('Transfer rejected audit logged successfully', {
        transferId: event.transferId,
      });
    } catch (error) {
      this.logger.error('Error handling TransferRejected audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferId: event.transferId,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
