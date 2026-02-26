import { Injectable, Logger } from '@nestjs/common';
import { ResilientCall } from '@shared/infrastructure/resilience';
import { AlertSeverity } from '@stock/domain/services/alertService';

import { EmailService } from './emailService';

import type {
  ILowStockAlertNotification,
  INotificationService,
  IStockThresholdExceededNotification,
} from './notificationService.interface';

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly resilientNotify = new ResilientCall({
    name: 'NotificationService',
    timeoutMs: 15_000,
    retry: { maxAttempts: 2, initialDelay: 1_000 },
    circuitBreaker: { failureThreshold: 10, resetTimeout: 120_000 },
  });

  constructor(
    // @ts-expect-error - EmailService is available for future implementation, currently unused
    private readonly _emailService: EmailService
  ) {}

  async sendLowStockAlert(notification: ILowStockAlertNotification): Promise<void> {
    await this.resilientNotify.execute(async () => {
      this.logger.log('Sending low stock alert notification', {
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        severity: notification.severity,
        currentStock: notification.currentStock.getNumericValue(),
      });

      const subject = this.getAlertSubject(notification.severity, 'Low Stock Alert');
      const message = this.buildLowStockMessage(notification);

      this.logger.warn('Low Stock Alert', {
        subject,
        message,
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        severity: notification.severity,
        orgId: notification.orgId,
      });

      // TODO: Implement actual email/WebSocket sending when ready
    });
  }

  async sendStockThresholdExceededAlert(
    notification: IStockThresholdExceededNotification
  ): Promise<void> {
    await this.resilientNotify.execute(async () => {
      this.logger.log('Sending stock threshold exceeded alert notification', {
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        currentStock: notification.currentStock.getNumericValue(),
        maxQuantity: notification.maxQuantity.getNumericValue(),
      });

      const subject = 'Stock Threshold Exceeded Alert';
      const message = this.buildStockThresholdExceededMessage(notification);

      this.logger.warn('Stock Threshold Exceeded Alert', {
        subject,
        message,
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        orgId: notification.orgId,
      });

      // TODO: Implement actual email/WebSocket sending when ready
    });
  }

  private getAlertSubject(severity: AlertSeverity, baseSubject: string): string {
    switch (severity) {
      case 'OUT_OF_STOCK':
        return `🚨 CRITICAL: ${baseSubject} - Out of Stock`;
      case 'CRITICAL':
        return `⚠️ CRITICAL: ${baseSubject}`;
      case 'LOW':
        return `⚠️ ${baseSubject}`;
      default:
        return baseSubject;
    }
  }

  private buildLowStockMessage(notification: ILowStockAlertNotification): string {
    const parts: string[] = [];
    parts.push(`Product ID: ${notification.productId}`);
    parts.push(`Warehouse ID: ${notification.warehouseId}`);
    parts.push(`Current Stock: ${notification.currentStock.getNumericValue()}`);
    if (notification.minQuantity) {
      parts.push(`Minimum Quantity: ${notification.minQuantity.getNumericValue()}`);
    }
    if (notification.safetyStock) {
      parts.push(`Safety Stock: ${notification.safetyStock.getNumericValue()}`);
    }
    parts.push(`Severity: ${notification.severity}`);
    return parts.join('\n');
  }

  private buildStockThresholdExceededMessage(
    notification: IStockThresholdExceededNotification
  ): string {
    const parts: string[] = [];
    parts.push(`Product ID: ${notification.productId}`);
    parts.push(`Warehouse ID: ${notification.warehouseId}`);
    parts.push(`Current Stock: ${notification.currentStock.getNumericValue()}`);
    parts.push(`Maximum Quantity: ${notification.maxQuantity.getNumericValue()}`);
    return parts.join('\n');
  }
}
