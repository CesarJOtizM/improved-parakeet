/* eslint-disable @typescript-eslint/no-explicit-any */
import { WarehouseCreatedEventHandler } from '@application/eventHandlers/warehouseCreatedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WarehouseCreatedEvent } from '@warehouse/domain/events/warehouseCreated.event';

describe('WarehouseCreatedEventHandler', () => {
  let handler: WarehouseCreatedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockWarehouse = (overrides: Partial<any> = {}): any => ({
    id: 'wh-123',
    orgId: 'org-123',
    createdAt: new Date(),
    code: {
      getValue: () => 'WH-001',
    },
    name: 'Main Warehouse',
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new WarehouseCreatedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: WarehouseCreated event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const event = new WarehouseCreatedEvent(mockWarehouse);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling WarehouseCreated event', {
        warehouseId: 'wh-123',
        code: 'WH-001',
        name: 'Main Warehouse',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Warehouse creation audit logged successfully', {
        warehouseId: 'wh-123',
        code: 'WH-001',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const event = new WarehouseCreatedEvent(mockWarehouse);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling WarehouseCreated event', {
        error: 'Logging error',
        warehouseId: 'wh-123',
        code: 'WH-001',
      });

      errorSpy.mockRestore();
    });
  });
});
