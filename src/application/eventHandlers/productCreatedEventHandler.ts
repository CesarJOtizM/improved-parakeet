import { Injectable, Inject, Logger } from '@nestjs/common';
import { ProductCreatedEvent } from '@product/domain/events/productCreated.event';
import { AuditService } from '@shared/audit/domain/services/auditService';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

@Injectable()
export class ProductCreatedEventHandler implements IDomainEventHandler<ProductCreatedEvent> {
  private readonly logger = new Logger(ProductCreatedEventHandler.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async handle(event: ProductCreatedEvent): Promise<void> {
    this.logger.log('Handling ProductCreated event', {
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
        AuditAction.create('CREATE'),
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

      this.logger.log('Product creation audit logged successfully', {
        productId: event.productId,
        sku: event.sku,
      });
    } catch (error) {
      this.logger.error('Error handling ProductCreated event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: event.productId,
        sku: event.sku,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
