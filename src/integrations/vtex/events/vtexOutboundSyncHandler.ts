import { Inject, Injectable, Logger } from '@nestjs/common';
import { VtexOutboundSyncUseCase } from '../application/vtexOutboundSyncUseCase.js';
import { SaleConfirmedEvent } from '@sale/domain/events/saleConfirmed.event';
import { SaleCompletedEvent } from '@sale/domain/events/saleCompleted.event';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';

import type { IDomainEventHandler } from '@shared/ports/events';
import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSyncLogRepository } from '../../shared/domain/ports/iIntegrationSyncLogRepository.port.js';
import type { DomainEvent } from '@shared/domain/events/domainEvent.base';

@Injectable()
export class VtexOutboundSyncHandler implements IDomainEventHandler<DomainEvent> {
  private readonly logger = new Logger(VtexOutboundSyncHandler.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository,
    private readonly vtexOutboundSyncUseCase: VtexOutboundSyncUseCase
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    try {
      let saleId: string | undefined;
      let orgId: string | undefined;
      let action: 'START_HANDLING' | 'INVOICE' | 'CANCEL';

      if (event instanceof SaleConfirmedEvent) {
        saleId = event.saleId;
        orgId = event.orgId;
        action = 'START_HANDLING';
      } else if (event instanceof SaleCompletedEvent) {
        saleId = event.saleId;
        orgId = event.orgId;
        action = 'INVOICE';
      } else if (event instanceof SaleCancelledEvent) {
        saleId = event.saleId;
        orgId = event.orgId;
        action = 'CANCEL';
      } else {
        return;
      }

      if (!saleId || !orgId) return;

      // Find sync logs that reference this sale to find the external order ID
      const connections = await this.connectionRepository.findByOrgId(orgId, {
        status: 'CONNECTED',
      });

      for (const connection of connections) {
        // Check sync direction
        if (connection.syncDirection === 'INBOUND_ONLY') continue;

        // Find the sync log that has this saleId
        const { data: logs } = await this.syncLogRepository.findByConnectionId(
          connection.id,
          1,
          100
        );
        const matchingLog = logs.find(l => l.saleId === saleId);

        if (!matchingLog) continue;

        this.logger.log('Triggering outbound sync', {
          connectionId: connection.id,
          externalOrderId: matchingLog.externalOrderId,
          action,
          saleId,
        });

        await this.vtexOutboundSyncUseCase.execute({
          connectionId: connection.id,
          externalOrderId: matchingLog.externalOrderId,
          action,
          orgId,
        });
      }
    } catch (error) {
      this.logger.error('Error in VTEX outbound sync handler', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventName: event.eventName,
      });
      // Don't throw - event handlers should not break the main flow
    }
  }
}
