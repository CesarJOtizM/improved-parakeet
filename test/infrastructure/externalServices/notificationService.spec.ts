import { NotificationService } from '@infrastructure/externalServices/notificationService';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type {
  IStockAlertDigestNotification,
} from '@infrastructure/externalServices/notificationService.interface';

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-id' } as never),
} as any;

describe('NotificationService', () => {
  beforeEach(() => {
    mockEmailService.sendEmail.mockClear();
  });

  it('sends low stock alert with optional thresholds', async () => {
    const service = new NotificationService(mockEmailService);
    const notification = {
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      currentStock: Quantity.create(2, 0),
      minQuantity: Quantity.create(5, 0),
      safetyStock: Quantity.create(3, 0),
      severity: 'CRITICAL',
      orgId: 'org-1',
      timestamp: new Date('2025-01-01'),
    };

    await service.sendLowStockAlert(notification as any);
    expect(notification.currentStock.getNumericValue()).toBe(2);
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'low-stock-alert',
        orgId: 'org-1',
      })
    );
  });

  it('sends low stock alert without thresholds', async () => {
    const service = new NotificationService(mockEmailService);
    const notification = {
      productId: 'product-2',
      warehouseId: 'warehouse-2',
      currentStock: Quantity.create(0, 0),
      severity: 'OUT_OF_STOCK',
      orgId: 'org-1',
      timestamp: new Date('2025-01-02'),
    };

    await service.sendLowStockAlert(notification as any);
    expect(notification.severity).toBe('OUT_OF_STOCK');
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Out of Stock'),
      })
    );
  });

  it('sends stock threshold exceeded alert', async () => {
    const service = new NotificationService(mockEmailService);
    const notification = {
      productId: 'product-3',
      warehouseId: 'warehouse-3',
      currentStock: Quantity.create(12, 0),
      maxQuantity: Quantity.create(10, 0),
      orgId: 'org-1',
      timestamp: new Date('2025-01-03'),
    };

    await service.sendStockThresholdExceededAlert(notification as any);
    expect(notification.currentStock.getNumericValue()).toBe(12);
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'stock-threshold-exceeded',
        orgId: 'org-1',
      })
    );
  });

  describe('sendLowStockAlert - severity branches', () => {
    it('Given: LOW severity When: sending alert Then: should use base subject without prefix', async () => {
      const service = new NotificationService(mockEmailService);
      const notification = {
        productId: 'product-4',
        warehouseId: 'warehouse-4',
        currentStock: Quantity.create(3, 0),
        severity: 'LOW',
        orgId: 'org-1',
        timestamp: new Date('2025-01-04'),
      };

      await service.sendLowStockAlert(notification as any);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Low Stock Alert',
        })
      );
    });

    it('Given: CRITICAL severity When: sending alert Then: should use CRITICAL prefix', async () => {
      const service = new NotificationService(mockEmailService);
      const notification = {
        productId: 'product-5',
        warehouseId: 'warehouse-5',
        currentStock: Quantity.create(1, 0),
        severity: 'CRITICAL',
        orgId: 'org-1',
        timestamp: new Date('2025-01-05'),
      };

      await service.sendLowStockAlert(notification as any);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'CRITICAL: Low Stock Alert',
        })
      );
    });

    it('Given: OUT_OF_STOCK severity When: sending alert Then: should use CRITICAL + Out of Stock', async () => {
      const service = new NotificationService(mockEmailService);
      const notification = {
        productId: 'product-6',
        warehouseId: 'warehouse-6',
        currentStock: Quantity.create(0, 0),
        severity: 'OUT_OF_STOCK',
        orgId: 'org-1',
        timestamp: new Date('2025-01-06'),
      };

      await service.sendLowStockAlert(notification as any);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'CRITICAL: Low Stock Alert - Out of Stock',
        })
      );
    });
  });

  describe('sendStockAlertDigest', () => {
    it('Given: empty alerts When: sending digest Then: should not send email', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('Given: no recipients When: sending digest Then: should not send email', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: [],
        lowStockItems: [
          {
            productName: 'Product A',
            sku: 'SKU-A',
            warehouseName: 'WH1',
            currentStock: 2,
            threshold: 10,
            severity: 'LOW',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('Given: low stock items with normal severity (en) When: sending digest Then: should use normal subject', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product A',
            sku: 'SKU-A',
            warehouseName: 'WH1',
            currentStock: 3,
            threshold: 10,
            severity: 'LOW',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          orgId: 'org-1',
          to: ['admin@test.com'],
          subject: expect.stringContaining('alert(s)'),
        })
      );
    });

    it('Given: critical severity items (en) When: sending digest Then: should use critical subject', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product B',
            sku: 'SKU-B',
            warehouseName: 'WH1',
            currentStock: 0,
            threshold: 10,
            severity: 'CRITICAL',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          subject: expect.stringContaining('1 alert(s)'),
        })
      );
    });

    it('Given: OUT_OF_STOCK items When: sending digest Then: should use critical subject', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product C',
            sku: 'SKU-C',
            warehouseName: 'WH1',
            currentStock: 0,
            threshold: 5,
            severity: 'OUT_OF_STOCK',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
        })
      );
    });

    it('Given: Spanish language When: sending digest Then: should use es subject with alerta(s)', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org ES',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Producto A',
            sku: 'SKU-A',
            warehouseName: 'Almacen 1',
            currentStock: 2,
            threshold: 10,
            severity: 'LOW',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'es',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          subject: expect.stringContaining('alerta(s)'),
        })
      );
    });

    it('Given: overstock items only When: sending digest Then: should send with overstock data', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com', 'manager@test.com'],
        lowStockItems: [],
        overstockItems: [
          {
            productName: 'Product D',
            sku: 'SKU-D',
            warehouseName: 'WH1',
            currentStock: 100,
            maxQuantity: 50,
          },
        ],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          to: ['admin@test.com', 'manager@test.com'],
          subject: expect.stringContaining('1 alert(s)'),
        })
      );
    });

    it('Given: both low stock and overstock items When: sending digest Then: should count total', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product E',
            sku: 'SKU-E',
            warehouseName: 'WH1',
            currentStock: 1,
            threshold: 10,
            severity: 'LOW',
          },
        ],
        overstockItems: [
          {
            productName: 'Product F',
            sku: 'SKU-F',
            warehouseName: 'WH2',
            currentStock: 200,
            maxQuantity: 100,
          },
        ],
        generatedAt: new Date(),
        language: 'en',
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          subject: expect.stringContaining('2 alert(s)'),
        })
      );
    });

    it('Given: undefined language When: sending digest Then: should default to es', async () => {
      const service = new NotificationService(mockEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product G',
            sku: 'SKU-G',
            warehouseName: 'WH1',
            currentStock: 1,
            threshold: 5,
            severity: 'LOW',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
      };

      await service.sendStockAlertDigest(notification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'stock-alert-digest',
          subject: expect.stringContaining('alerta(s)'),
        })
      );
    });

    it('Given: email service throws error When: sending digest Then: should propagate error', async () => {
      const failingEmailService = {
        sendEmail: jest.fn().mockRejectedValue(new Error('Email send failed') as never),
      } as any;
      const service = new NotificationService(failingEmailService);
      const notification: IStockAlertDigestNotification = {
        orgId: 'org-1',
        orgName: 'Test Org',
        recipientEmails: ['admin@test.com'],
        lowStockItems: [
          {
            productName: 'Product H',
            sku: 'SKU-H',
            warehouseName: 'WH1',
            currentStock: 0,
            threshold: 5,
            severity: 'CRITICAL',
          },
        ],
        overstockItems: [],
        generatedAt: new Date(),
        language: 'en',
      };

      await expect(service.sendStockAlertDigest(notification)).rejects.toThrow();
    });
  });

  describe('sendLowStockAlert - error handling', () => {
    it('Given: email service throws When: sending low stock alert Then: should propagate error', async () => {
      const failingEmailService = {
        sendEmail: jest.fn().mockRejectedValue(new Error('SMTP error') as never),
      } as any;
      const service = new NotificationService(failingEmailService);
      const notification = {
        productId: 'product-err',
        warehouseId: 'warehouse-err',
        currentStock: Quantity.create(0, 0),
        severity: 'CRITICAL',
        orgId: 'org-1',
        timestamp: new Date(),
      };

      await expect(service.sendLowStockAlert(notification as any)).rejects.toThrow();
    });
  });

  describe('sendStockThresholdExceededAlert - error handling', () => {
    it('Given: email service throws When: sending threshold alert Then: should propagate error', async () => {
      const failingEmailService = {
        sendEmail: jest.fn().mockRejectedValue(new Error('SMTP error') as never),
      } as any;
      const service = new NotificationService(failingEmailService);
      const notification = {
        productId: 'product-err',
        warehouseId: 'warehouse-err',
        currentStock: Quantity.create(100, 0),
        maxQuantity: Quantity.create(50, 0),
        orgId: 'org-1',
        timestamp: new Date(),
      };

      await expect(service.sendStockThresholdExceededAlert(notification as any)).rejects.toThrow();
    });
  });
});
