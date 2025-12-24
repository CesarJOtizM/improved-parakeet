import { Injectable, Logger } from '@nestjs/common';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';

import type { INotificationService } from '@infrastructure/externalServices/notificationService.interface';

@Injectable()
export class LowStockAlertEventHandler implements IDomainEventHandler<LowStockAlertEvent> {
  private readonly logger = new Logger(LowStockAlertEventHandler.name);

  constructor(private readonly notificationService: INotificationService) {}

  async handle(event: LowStockAlertEvent): Promise<void> {
    this.logger.log('Handling LowStockAlert event', {
      productId: event.productId,
      warehouseId: event.warehouseId,
      severity: event.severity,
      currentStock: event.currentStock.getNumericValue(),
    });

    try {
      // Send notification based on severity
      await this.notificationService.sendLowStockAlert({
        productId: event.productId,
        warehouseId: event.warehouseId,
        currentStock: event.currentStock,
        minQuantity: event.minQuantity,
        safetyStock: event.safetyStock,
        severity: event.severity,
        orgId: event.orgId,
      });

      this.logger.log('Low stock alert notification sent successfully', {
        productId: event.productId,
        warehouseId: event.warehouseId,
        severity: event.severity,
      });
    } catch (error) {
      this.logger.error('Error handling LowStockAlert event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: event.productId,
        warehouseId: event.warehouseId,
      });
      // Don't throw - we don't want notification errors to break event processing
    }
  }
}
