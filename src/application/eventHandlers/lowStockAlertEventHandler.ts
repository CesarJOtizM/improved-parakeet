import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';

@Injectable()
export class LowStockAlertEventHandler implements IDomainEventHandler<LowStockAlertEvent> {
  private readonly logger = new Logger(LowStockAlertEventHandler.name);

  async handle(event: LowStockAlertEvent): Promise<void> {
    this.logger.log('Handling LowStockAlert event', {
      productId: event.productId,
      warehouseId: event.warehouseId,
      severity: event.severity,
      currentStock: event.currentStock.getNumericValue(),
    });

    // Email notifications are now handled via consolidated digest in StockValidationJob.
    // This handler is kept for audit trail / logging purposes only.
  }
}
