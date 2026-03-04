import { Injectable, Logger } from '@nestjs/common';
import { ResilientCall } from '@shared/infrastructure/resilience';
import { AlertSeverity } from '@stock/domain/services/alertService';

import { EmailService } from './emailService';
import { lowStockAlertTemplate } from './templates/lowStockAlert.template';
import { stockAlertDigestTemplate } from './templates/stockAlertDigest.template';
import { type EmailLanguage, t } from './templates/translations/email-translations';

import type {
  ILowStockAlertNotification,
  INotificationService,
  IStockAlertDigestNotification,
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

  private getAlertRecipient(): string {
    return (
      process.env.STOCK_ALERT_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@nevadainventory.com'
    );
  }

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
        to: this.getAlertRecipient(),
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
        to: this.getAlertRecipient(),
        subject,
        body: html,
        template: 'stock-threshold-exceeded',
        orgId: notification.orgId,
      });
    });
  }

  async sendStockAlertDigest(notification: IStockAlertDigestNotification): Promise<void> {
    const totalAlerts = notification.lowStockItems.length + notification.overstockItems.length;

    if (totalAlerts === 0 || notification.recipientEmails.length === 0) {
      return;
    }

    await this.resilientNotify.execute(async () => {
      const lang: EmailLanguage = notification.language === 'en' ? 'en' : 'es';

      this.logger.log('Sending stock alert digest', {
        orgId: notification.orgId,
        orgName: notification.orgName,
        language: lang,
        lowStockCount: notification.lowStockItems.length,
        overstockCount: notification.overstockItems.length,
        recipients: notification.recipientEmails.length,
      });

      const hasCritical = notification.lowStockItems.some(
        i => i.severity === 'OUT_OF_STOCK' || i.severity === 'CRITICAL'
      );

      const subjectKey = hasCritical ? 'subjectCritical' : 'subjectNormal';
      const subject = `${t(lang, 'digest', subjectKey)} - ${totalAlerts} ${lang === 'es' ? 'alerta(s)' : 'alert(s)'}`;

      const html = stockAlertDigestTemplate({
        orgName: notification.orgName,
        lowStockItems: notification.lowStockItems,
        overstockItems: notification.overstockItems,
        generatedAt: notification.generatedAt,
        language: lang,
      });

      await this.emailService.sendEmail({
        to: notification.recipientEmails,
        subject,
        body: html,
        template: 'stock-alert-digest',
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
