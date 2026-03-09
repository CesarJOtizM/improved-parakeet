/* eslint-disable @typescript-eslint/no-explicit-any */
import { SaleCancelledEventHandler } from '@application/eventHandlers/saleCancelledEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';

describe('SaleCancelledEventHandler', () => {
  let handler: SaleCancelledEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockSale = (overrides: Partial<any> = {}): any => ({
    id: 'sale-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    cancelledAt: new Date(),
    createdAt: new Date(),
    saleNumber: {
      getValue: () => 'SALE-001',
    },
    status: {
      getValue: () => 'CANCELLED',
      isDraft: () => false,
      isConfirmed: () => false,
      isCancelled: () => true,
    },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new SaleCancelledEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: SaleCancelled event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockSale = createMockSale();
      const event = new SaleCancelledEvent(mockSale, 'Customer request');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling SaleCancelled event', {
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
        orgId: 'org-123',
        reason: 'Customer request',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Sale cancellation audit logged successfully', {
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
      });
    });

    it('Given: SaleCancelled event without reason When: handling event Then: should log success message', async () => {
      // Arrange
      const mockSale = createMockSale({ id: 'sale-456' });
      mockSale.saleNumber.getValue = () => 'SALE-002';
      const event = new SaleCancelledEvent(mockSale);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Sale cancellation audit logged successfully', {
        saleId: 'sale-456',
        saleNumber: 'SALE-002',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockSale = createMockSale();
      const event = new SaleCancelledEvent(mockSale, 'Customer request');

      // Mock logger.log to throw an error on the second call (inside try block)
      let callCount = 0;
      const errorSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second call is inside try block
          throw new Error('Logging error');
        }
      });
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling SaleCancelled event', {
        error: 'Logging error',
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
      });

      errorSpy.mockRestore();
    });

    it('Given: non-Error thrown When: handling event Then: should handle gracefully', async () => {
      // Arrange
      const mockSale = createMockSale();
      const event = new SaleCancelledEvent(mockSale, 'Customer request');

      let callCount = 0;
      const errorSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw 'string-error';
        }
      });
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert - should not throw
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling SaleCancelled event', {
        error: 'Unknown error',
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
      });

      errorSpy.mockRestore();
    });
  });
});
