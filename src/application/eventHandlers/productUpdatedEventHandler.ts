import { Injectable, Inject, Logger } from '@nestjs/common';
import { ProductUpdatedEvent } from '@product/domain/events/productUpdated.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class ProductUpdatedEventHandler implements IDomainEventHandler<ProductUpdatedEvent> {
  private readonly logger = new Logger(ProductUpdatedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: ProductUpdatedEvent): Promise<void> {
    this.logger.log('Handling ProductUpdated event', {
      productId: event.productId,
      sku: event.sku,
      name: event.name,
      orgId: event.orgId,
      occurredOn: event.occurredOn.toISOString(),
    });

    try {
      await AuditService.logEvent(
        event,
        EntityType.create('Product'),
        AuditAction.create('UPDATE'),
        this.auditRepository,
        {
          entityId: event.productId,
          orgId: event.orgId,
          additionalMetadata: {
            sku: event.sku,
            name: event.name,
          },
        }
      );

      this.logger.log('Product update audit logged successfully', {
        productId: event.productId,
        sku: event.sku,
      });
    } catch (error) {
      this.logger.error('Error handling ProductUpdated event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: event.productId,
        sku: event.sku,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
