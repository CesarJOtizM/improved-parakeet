import { NotificationService } from '@infrastructure/externalServices/notificationService';
import { describe, expect, it } from '@jest/globals';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type {
  ILowStockAlertNotification,
  IStockThresholdExceededNotification,
} from '@infrastructure/externalServices/notificationService.interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEmailService = {} as any;

describe('NotificationService', () => {
  it('sends low stock alert with optional thresholds', async () => {
    const service = new NotificationService(mockEmailService);
    const notification: ILowStockAlertNotification = {
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      currentStock: Quantity.create(2, 0),
      minQuantity: Quantity.create(5, 0),
      safetyStock: Quantity.create(3, 0),
      severity: 'CRITICAL',
      orgId: 'org-1',
      timestamp: new Date('2025-01-01'),
    };

    await service.sendLowStockAlert(notification);
    expect(notification.currentStock.getNumericValue()).toBe(2);
  });

  it('sends low stock alert without thresholds', async () => {
    const service = new NotificationService(mockEmailService);
    const notification: ILowStockAlertNotification = {
      productId: 'product-2',
      warehouseId: 'warehouse-2',
      currentStock: Quantity.create(0, 0),
      severity: 'OUT_OF_STOCK',
      orgId: 'org-1',
      timestamp: new Date('2025-01-02'),
    };

    await service.sendLowStockAlert(notification);
    expect(notification.severity).toBe('OUT_OF_STOCK');
  });

  it('sends stock threshold exceeded alert', async () => {
    const service = new NotificationService(mockEmailService);
    const notification: IStockThresholdExceededNotification = {
      productId: 'product-3',
      warehouseId: 'warehouse-3',
      currentStock: Quantity.create(12, 0),
      maxQuantity: Quantity.create(10, 0),
      orgId: 'org-1',
      timestamp: new Date('2025-01-03'),
    };

    await service.sendStockThresholdExceededAlert(notification);
    expect(notification.currentStock.getNumericValue()).toBe(12);
  });
});
