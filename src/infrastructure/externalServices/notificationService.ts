import { Injectable, Logger } from '@nestjs/common';
import { ResilientCall } from '@shared/infrastructure/resilience';
import { AlertSeverity } from '@stock/domain/services/alertService';

import { EmailService } from './emailService';
import { lowStockAlertTemplate } from './templates/lowStockAlert.template';

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

  constructor(private readonly emailService: EmailService) {}

  async sendLowStockAlert(notification: ILowStockAlertNotification): Promise<void> {
    await this.resilientNotify.execute(async () => {
      this.logger.log('Sending low stock alert notification', {
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        severity: notification.severity,
        currentStock: notification.currentStock.getNumericValue(),
      });

      const subject = this.getAlertSubject(notification.severity, 'Low Stock Alert');

      const html = lowStockAlertTemplate({
        items: [
          {
            productId: notification.productId,
            warehouseId: notification.warehouseId,
            currentStock: notification.currentStock.getNumericValue(),
            minQuantity: notification.minQuantity?.getNumericValue(),
            severity: notification.severity,
          },
        ],
      });

      await this.emailService.sendEmail({
        to: 'admin@nevadainventory.com',
        subject,
        body: html,
        template: 'low-stock-alert',
        orgId: notification.orgId,
      });
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

      const html = lowStockAlertTemplate({
        items: [
          {
            productId: notification.productId,
            warehouseId: notification.warehouseId,
            currentStock: notification.currentStock.getNumericValue(),
            severity: 'CRITICAL',
          },
        ],
      });

      await this.emailService.sendEmail({
        to: 'admin@nevadainventory.com',
        subject,
        body: html,
        template: 'stock-threshold-exceeded',
        orgId: notification.orgId,
      });
    });
  }

  private getAlertSubject(severity: AlertSeverity, baseSubject: string): string {
    switch (severity) {
      case 'OUT_OF_STOCK':
        return `CRITICAL: ${baseSubject} - Out of Stock`;
      case 'CRITICAL':
        return `CRITICAL: ${baseSubject}`;
      case 'LOW':
        return baseSubject;
      default:
        return baseSubject;
    }
  }
}
