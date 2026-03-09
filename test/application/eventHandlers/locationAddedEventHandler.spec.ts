/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocationAddedEventHandler } from '@application/eventHandlers/locationAddedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LocationAddedEvent } from '@warehouse/domain/events/locationAdded.event';

describe('LocationAddedEventHandler', () => {
  let handler: LocationAddedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockLocation = (overrides: Partial<any> = {}): any => ({
    id: 'loc-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    createdAt: new Date(),
    code: {
      getValue: () => 'LOC-001',
    },
    name: 'Location One',
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new LocationAddedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: LocationAdded event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockLocation = createMockLocation();
      const event = new LocationAddedEvent(mockLocation);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling LocationAdded event', {
        locationId: 'loc-123',
        warehouseId: 'warehouse-789',
        code: 'LOC-001',
        name: 'Location One',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Location addition audit logged successfully', {
        locationId: 'loc-123',
        code: 'LOC-001',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockLocation = createMockLocation();
      const event = new LocationAddedEvent(mockLocation);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling LocationAdded event', {
        error: 'Logging error',
        locationId: 'loc-123',
        code: 'LOC-001',
      });

      errorSpy.mockRestore();
    });

    it('Given: non-Error thrown When: handling event Then: should handle gracefully', async () => {
      // Arrange
      const mockLocation = createMockLocation();
      const event = new LocationAddedEvent(mockLocation);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling LocationAdded event', {
        error: 'Unknown error',
        locationId: 'loc-123',
        code: 'LOC-001',
      });

      errorSpy.mockRestore();
    });
  });
});
