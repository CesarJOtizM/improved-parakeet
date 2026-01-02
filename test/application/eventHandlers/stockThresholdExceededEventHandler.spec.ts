/* eslint-disable @typescript-eslint/no-explicit-any */
import { StockThresholdExceededEventHandler } from '@application/eventHandlers/stockThresholdExceededEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';

describe('StockThresholdExceededEventHandler', () => {
  let handler: StockThresholdExceededEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockNotificationService: any;

  const createMockQuantity = (value: number): any => ({
    getNumericValue: () => value,
    getValue: () => value,
  });

  beforeEach(() => {
    mockNotificationService = {
      sendStockThresholdExceededAlert: jest.fn(),
    } as any;
    mockNotificationService.sendStockThresholdExceededAlert.mockResolvedValue(undefined);
    handler = new StockThresholdExceededEventHandler(mockNotificationService);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: StockThresholdExceeded event When: handling event Then: should send notification', async () => {
      // Arrange
      const event = new StockThresholdExceededEvent(
        'product-123',
        'warehouse-789',
        createMockQuantity(150),
        createMockQuantity(100),
        'org-123',
        new Date()
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling StockThresholdExceeded event', {
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        currentStock: 150,
        maxQuantity: 100,
      });

      expect(mockNotificationService.sendStockThresholdExceededAlert).toHaveBeenCalledWith({
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        currentStock: expect.any(Object),
        maxQuantity: expect.any(Object),
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Stock threshold exceeded notification sent successfully',
        {
          productId: 'product-123',
          warehouseId: 'warehouse-789',
        }
      );
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const event = new StockThresholdExceededEvent(
        'product-123',
        'warehouse-789',
        createMockQuantity(150),
        createMockQuantity(100),
        'org-123',
        new Date()
      );

      mockNotificationService.sendStockThresholdExceededAlert.mockRejectedValue(
        new Error('Notification error')
      );
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling StockThresholdExceeded event', {
        error: 'Notification error',
        productId: 'product-123',
        warehouseId: 'warehouse-789',
      });
    });
  });
});
