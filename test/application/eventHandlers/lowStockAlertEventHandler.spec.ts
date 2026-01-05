/* eslint-disable @typescript-eslint/no-explicit-any */
import { LowStockAlertEventHandler } from '@application/eventHandlers/lowStockAlertEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';

describe('LowStockAlertEventHandler', () => {
  let handler: LowStockAlertEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockNotificationService: any;

  const createMockQuantity = (value: number): any => ({
    getNumericValue: () => value,
    getValue: () => value,
  });

  beforeEach(() => {
    mockNotificationService = {
      sendLowStockAlert: jest.fn(),
    } as any;
    mockNotificationService.sendLowStockAlert.mockResolvedValue(undefined);
    handler = new LowStockAlertEventHandler(mockNotificationService);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: LowStockAlert event When: handling event Then: should send notification', async () => {
      // Arrange
      const event = new LowStockAlertEvent(
        'product-123',
        'warehouse-789',
        createMockQuantity(5),
        createMockQuantity(10),
        createMockQuantity(15),
        'LOW',
        'org-123',
        new Date()
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling LowStockAlert event', {
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        severity: 'LOW',
        currentStock: 5,
      });

      expect(mockNotificationService.sendLowStockAlert).toHaveBeenCalledWith({
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        currentStock: expect.any(Object),
        minQuantity: expect.any(Object),
        safetyStock: expect.any(Object),
        severity: 'LOW',
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith('Low stock alert notification sent successfully', {
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        severity: 'LOW',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const event = new LowStockAlertEvent(
        'product-123',
        'warehouse-789',
        createMockQuantity(5),
        createMockQuantity(10),
        createMockQuantity(15),
        'CRITICAL',
        'org-123',
        new Date()
      );

      mockNotificationService.sendLowStockAlert.mockRejectedValue(new Error('Notification error'));
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling LowStockAlert event', {
        error: 'Notification error',
        productId: 'product-123',
        warehouseId: 'warehouse-789',
      });
    });
  });
});
