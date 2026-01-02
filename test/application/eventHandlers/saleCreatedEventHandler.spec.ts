/* eslint-disable @typescript-eslint/no-explicit-any */
import { SaleCreatedEventHandler } from '@application/eventHandlers/saleCreatedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SaleCreatedEvent } from '@sale/domain/events/saleCreated.event';

describe('SaleCreatedEventHandler', () => {
  let handler: SaleCreatedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockSale = (overrides: Partial<any> = {}): any => ({
    id: 'sale-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    createdAt: new Date(),
    saleNumber: {
      getValue: () => 'SALE-001',
    },
    status: {
      getValue: () => 'DRAFT',
      isDraft: () => true,
      isConfirmed: () => false,
      isCancelled: () => false,
    },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new SaleCreatedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: SaleCreated event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockSale = createMockSale();
      const event = new SaleCreatedEvent(mockSale);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling SaleCreated event', {
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Sale creation audit logged successfully', {
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
      });
    });

    it('Given: SaleCreated event with different sale When: handling event Then: should log success message', async () => {
      // Arrange
      const mockSale = createMockSale({ id: 'sale-456', warehouseId: 'warehouse-222' });
      mockSale.saleNumber.getValue = () => 'SALE-002';
      const event = new SaleCreatedEvent(mockSale);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Sale creation audit logged successfully', {
        saleId: 'sale-456',
        saleNumber: 'SALE-002',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockSale = createMockSale();
      const event = new SaleCreatedEvent(mockSale);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling SaleCreated event', {
        error: 'Logging error',
        saleId: 'sale-123',
        saleNumber: 'SALE-001',
      });

      errorSpy.mockRestore();
    });
  });
});
