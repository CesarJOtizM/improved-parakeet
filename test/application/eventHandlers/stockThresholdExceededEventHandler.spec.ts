/* eslint-disable @typescript-eslint/no-explicit-any */
import { StockThresholdExceededEventHandler } from '@application/eventHandlers/stockThresholdExceededEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';

describe('StockThresholdExceededEventHandler', () => {
  let handler: StockThresholdExceededEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  const createMockQuantity = (value: number): any => ({
    getNumericValue: () => value,
    getValue: () => value,
  });

  beforeEach(() => {
    handler = new StockThresholdExceededEventHandler();
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
  });

  describe('handle', () => {
    it('Given: StockThresholdExceeded event When: handling event Then: should log the event', async () => {
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
    });

    it('Given: threshold exceeded event When: handling Then: should complete without errors', async () => {
      // Arrange
      const event = new StockThresholdExceededEvent(
        'product-456',
        'warehouse-789',
        createMockQuantity(200),
        createMockQuantity(100),
        'org-123',
        new Date()
      );

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
