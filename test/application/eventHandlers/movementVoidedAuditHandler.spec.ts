/* eslint-disable @typescript-eslint/no-explicit-any */
import { MovementVoidedAuditHandler } from '@application/eventHandlers/movementVoidedAuditHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MovementVoidedEvent } from '@movement/domain/events/movementVoided.event';

describe('MovementVoidedAuditHandler', () => {
  let handler: MovementVoidedAuditHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockMovement = (overrides: Partial<any> = {}): any => ({
    id: 'mov-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    createdAt: new Date(),
    voidedAt: new Date(),
    type: {
      getValue: () => 'OUT',
    },
    status: {
      getValue: () => 'VOIDED',
    },
    getLines: () => [],
    getTotalQuantity: () => 0,
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new MovementVoidedAuditHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: MovementVoided event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const event = new MovementVoidedEvent(mockMovement);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling MovementVoided audit event', {
        movementId: 'mov-123',
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith('Movement voided audit logged successfully', {
        movementId: 'mov-123',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const event = new MovementVoidedEvent(mockMovement);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling MovementVoided audit event', {
        error: 'Logging error',
        movementId: 'mov-123',
      });

      errorSpy.mockRestore();
    });

    it('Given: non-Error thrown When: handling event Then: should handle gracefully', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const event = new MovementVoidedEvent(mockMovement);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling MovementVoided audit event', {
        error: 'Unknown error',
        movementId: 'mov-123',
      });

      errorSpy.mockRestore();
    });
  });
});
