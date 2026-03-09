/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductCreatedEventHandler } from '@application/eventHandlers/productCreatedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProductCreatedEvent } from '@product/domain/events/productCreated.event';

describe('ProductCreatedEventHandler', () => {
  let handler: ProductCreatedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockProduct = (overrides: Partial<any> = {}): any => ({
    id: 'prod-123',
    orgId: 'org-123',
    createdAt: new Date(),
    sku: {
      getValue: () => 'SKU-001',
    },
    name: {
      getValue: () => 'Product One',
    },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new ProductCreatedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: ProductCreated event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const event = new ProductCreatedEvent(mockProduct);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling ProductCreated event', {
        productId: 'prod-123',
        sku: 'SKU-001',
        name: 'Product One',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Product creation audit logged successfully', {
        productId: 'prod-123',
        sku: 'SKU-001',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const event = new ProductCreatedEvent(mockProduct);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling ProductCreated event', {
        error: 'Logging error',
        productId: 'prod-123',
        sku: 'SKU-001',
      });

      errorSpy.mockRestore();
    });

    it('Given: non-Error thrown When: handling event Then: should handle gracefully', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const event = new ProductCreatedEvent(mockProduct);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling ProductCreated event', {
        error: 'Unknown error',
        productId: 'prod-123',
        sku: 'SKU-001',
      });

      errorSpy.mockRestore();
    });
  });
});
