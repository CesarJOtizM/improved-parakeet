import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';

@Injectable()
export class StockThresholdExceededEventHandler implements IDomainEventHandler<StockThresholdExceededEvent> {
  private readonly logger = new Logger(StockThresholdExceededEventHandler.name);

  async handle(event: StockThresholdExceededEvent): Promise<void> {
    this.logger.log('Handling StockThresholdExceeded event', {
      productId: event.productId,
      warehouseId: event.warehouseId,
      currentStock: event.currentStock.getNumericValue(),
      maxQuantity: event.maxQuantity.getNumericValue(),
    });

    // Email notifications are now handled via consolidated digest in StockValidationJob.
    // This handler is kept for audit trail / logging purposes only.
  }
}
