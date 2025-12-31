/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserStatusChangedEventHandler } from '@application/eventHandlers/userStatusChangedEventHandler';
import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('UserStatusChangedEventHandler', () => {
  let handler: UserStatusChangedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    const mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new UserStatusChangedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: UserStatusChanged event When: handling event Then: should log audit information', async () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        'user-123',
        'ACTIVE',
        'INACTIVE',
        'admin-789',
        'org-123',
        'User requested deactivation'
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling UserStatusChanged event', {
        userId: 'user-123',
        oldStatus: 'ACTIVE',
        newStatus: 'INACTIVE',
        changedBy: 'admin-789',
        orgId: 'org-123',
        reason: 'User requested deactivation',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('User status change audit logged successfully', {
        userId: 'user-123',
        oldStatus: 'ACTIVE',
        newStatus: 'INACTIVE',
      });
    });

    it('Given: UserStatusChanged event without reason When: handling event Then: should log audit information', async () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        'user-123',
        'INACTIVE',
        'ACTIVE',
        'admin-789',
        'org-123'
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling UserStatusChanged event', {
        userId: 'user-123',
        oldStatus: 'INACTIVE',
        newStatus: 'ACTIVE',
        changedBy: 'admin-789',
        orgId: 'org-123',
        reason: undefined,
        occurredOn: expect.any(String),
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        'user-123',
        'ACTIVE',
        'LOCKED',
        'admin-789',
        'org-123',
        'Security breach'
      );

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling UserStatusChanged event', {
        error: 'Logging error',
        userId: 'user-123',
        oldStatus: 'ACTIVE',
        newStatus: 'LOCKED',
      });

      errorSpy.mockRestore();
    });
  });
});
