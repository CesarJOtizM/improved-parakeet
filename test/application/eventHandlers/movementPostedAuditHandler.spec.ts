/* eslint-disable @typescript-eslint/no-explicit-any */
import { MovementPostedAuditHandler } from '@application/eventHandlers/movementPostedAuditHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';

describe('MovementPostedAuditHandler', () => {
  let handler: MovementPostedAuditHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockMovement = (overrides: Partial<any> = {}): any => ({
    id: 'mov-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    createdAt: new Date(),
    postedAt: new Date(),
    type: {
      getValue: () => 'IN',
    },
    status: {
      getValue: () => 'POSTED',
    },
    getLines: () => [
      { quantity: { getNumericValue: () => 10 } },
      { quantity: { getNumericValue: () => 5 } },
    ],
    getTotalQuantity: () => 15,
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new MovementPostedAuditHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: MovementPosted event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const event = new MovementPostedEvent(mockMovement);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling MovementPosted audit event', {
        movementId: 'mov-123',
        type: 'IN',
        warehouseId: 'warehouse-789',
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith('Movement posted audit logged successfully', {
        movementId: 'mov-123',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const event = new MovementPostedEvent(mockMovement);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling MovementPosted audit event', {
        error: 'Logging error',
        movementId: 'mov-123',
      });

      errorSpy.mockRestore();
    });
  });
});
