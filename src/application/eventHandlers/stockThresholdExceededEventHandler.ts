import { NotificationService } from '@infrastructure/externalServices/notificationService';
import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';

@Injectable()
export class StockThresholdExceededEventHandler implements IDomainEventHandler<StockThresholdExceededEvent> {
  private readonly logger = new Logger(StockThresholdExceededEventHandler.name);

  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: StockThresholdExceededEvent): Promise<void> {
    this.logger.log('Handling StockThresholdExceeded event', {
      productId: event.productId,
      warehouseId: event.warehouseId,
      currentStock: event.currentStock.getNumericValue(),
      maxQuantity: event.maxQuantity.getNumericValue(),
    });

    try {
      // Send notification
      await this.notificationService.sendStockThresholdExceededAlert({
        productId: event.productId,
        warehouseId: event.warehouseId,
        currentStock: event.currentStock,
        maxQuantity: event.maxQuantity,
        orgId: event.orgId,
      });

      this.logger.log('Stock threshold exceeded notification sent successfully', {
        productId: event.productId,
        warehouseId: event.warehouseId,
      });
    } catch (error) {
      this.logger.error('Error handling StockThresholdExceeded event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: event.productId,
        warehouseId: event.warehouseId,
      });
      // Don't throw - we don't want notification errors to break event processing
    }
  }
}
