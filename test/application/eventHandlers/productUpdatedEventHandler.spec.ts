/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductUpdatedEventHandler } from '@application/eventHandlers/productUpdatedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProductUpdatedEvent } from '@product/domain/events/productUpdated.event';

describe('ProductUpdatedEventHandler', () => {
  let handler: ProductUpdatedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockProduct = (overrides: Partial<any> = {}): any => ({
    id: 'prod-123',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: {
      getValue: () => 'SKU-001',
    },
    name: {
      getValue: () => 'Updated Product',
    },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new ProductUpdatedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: ProductUpdated event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const event = new ProductUpdatedEvent(mockProduct);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling ProductUpdated event', {
        productId: 'prod-123',
        sku: 'SKU-001',
        name: 'Updated Product',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Product update audit logged successfully', {
        productId: 'prod-123',
        sku: 'SKU-001',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const event = new ProductUpdatedEvent(mockProduct);

      // Mock logger.log to throw an error on the second call (inside try block)
      let callCount = 0;
      const errorSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Logging error');
        }
      });
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling ProductUpdated event', {
        error: 'Logging error',
        productId: 'prod-123',
        sku: 'SKU-001',
      });

      errorSpy.mockRestore();
    });
  });
});
