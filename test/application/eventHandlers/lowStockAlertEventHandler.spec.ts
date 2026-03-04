/* eslint-disable @typescript-eslint/no-explicit-any */
import { LowStockAlertEventHandler } from '@application/eventHandlers/lowStockAlertEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';

describe('LowStockAlertEventHandler', () => {
  let handler: LowStockAlertEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  const createMockQuantity = (value: number): any => ({
    getNumericValue: () => value,
    getValue: () => value,
  });

  beforeEach(() => {
    handler = new LowStockAlertEventHandler();
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
  });

  describe('handle', () => {
    it('Given: LowStockAlert event When: handling event Then: should log the event', async () => {
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
    });

    it('Given: critical severity event When: handling event Then: should log without errors', async () => {
      // Arrange
      const event = new LowStockAlertEvent(
        'product-123',
        'warehouse-789',
        createMockQuantity(0),
        createMockQuantity(10),
        createMockQuantity(15),
        'OUT_OF_STOCK',
        'org-123',
        new Date()
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling LowStockAlert event', {
        productId: 'product-123',
        warehouseId: 'warehouse-789',
        severity: 'OUT_OF_STOCK',
        currentStock: 0,
      });
    });
  });
});
