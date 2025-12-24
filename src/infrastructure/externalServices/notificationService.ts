import { Injectable, Logger } from '@nestjs/common';
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

  constructor(
    // @ts-expect-error - EmailService is available for future implementation, currently unused
    private readonly _emailService: EmailService
  ) {
    // EmailService is available for future implementation
    // Currently notifications are logged only
  }

  async sendLowStockAlert(notification: ILowStockAlertNotification): Promise<void> {
    this.logger.log('Sending low stock alert notification', {
      productId: notification.productId,
      warehouseId: notification.warehouseId,
      severity: notification.severity,
      currentStock: notification.currentStock.getNumericValue(),
    });

    try {
      // Determine email subject based on severity
      const subject = this.getAlertSubject(notification.severity, 'Low Stock Alert');
      const message = this.buildLowStockMessage(notification);

      // In a real implementation, you would:
      // 1. Get organization admin emails
      // 2. Get warehouse manager emails
      // 3. Send email to relevant recipients
      // 4. Send WebSocket notification if gateway is available

      // For now, we'll log the notification
      this.logger.warn('Low Stock Alert', {
        subject,
        message,
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        severity: notification.severity,
        orgId: notification.orgId,
      });

      // TODO: Implement actual email sending when user management is ready
      // await this.emailService.sendEmail({
      //   to: adminEmails,
      //   subject,
      //   template: 'low-stock-alert',
      //   variables: {
      //     productId: notification.productId,
      //     warehouseId: notification.warehouseId,
      //     currentStock: notification.currentStock.getNumericValue(),
      //     minQuantity: notification.minQuantity?.getNumericValue(),
      //     safetyStock: notification.safetyStock?.getNumericValue(),
      //     severity: notification.severity,
      //   },
      //   orgId: notification.orgId,
      // });
    } catch (error) {
      this.logger.error('Error sending low stock alert notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: notification.productId,
        warehouseId: notification.warehouseId,
      });
      throw error;
    }
  }

  async sendStockThresholdExceededAlert(
    notification: IStockThresholdExceededNotification
  ): Promise<void> {
    this.logger.log('Sending stock threshold exceeded alert notification', {
      productId: notification.productId,
      warehouseId: notification.warehouseId,
      currentStock: notification.currentStock.getNumericValue(),
      maxQuantity: notification.maxQuantity.getNumericValue(),
    });

    try {
      const subject = 'Stock Threshold Exceeded Alert';
      const message = this.buildStockThresholdExceededMessage(notification);

      this.logger.warn('Stock Threshold Exceeded Alert', {
        subject,
        message,
        productId: notification.productId,
        warehouseId: notification.warehouseId,
        orgId: notification.orgId,
      });

      // TODO: Implement actual email sending when user management is ready
    } catch (error) {
      this.logger.error('Error sending stock threshold exceeded alert notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: notification.productId,
        warehouseId: notification.warehouseId,
      });
      throw error;
    }
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
