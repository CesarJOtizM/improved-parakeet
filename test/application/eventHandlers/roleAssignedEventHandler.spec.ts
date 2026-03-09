/* eslint-disable @typescript-eslint/no-explicit-any */
import { RoleAssignedEventHandler } from '@application/eventHandlers/roleAssignedEventHandler';
import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('RoleAssignedEventHandler', () => {
  let handler: RoleAssignedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    const mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new RoleAssignedEventHandler(mockAuditRepository);
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: RoleAssigned event When: handling event Then: should log audit information', async () => {
      // Arrange
      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling RoleAssigned event', {
        userId: 'user-123',
        roleId: 'role-456',
        roleName: 'SUPERVISOR',
        assignedBy: 'admin-789',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('Role assignment audit logged successfully', {
        userId: 'user-123',
        roleName: 'SUPERVISOR',
      });
    });

    it('Given: RoleAssigned event When: handling event Then: should log success message', async () => {
      // Arrange
      const event = new RoleAssignedEvent('user-123', 'role-456', 'ADMIN', 'admin-789', 'org-123');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Role assignment audit logged successfully', {
        userId: 'user-123',
        roleName: 'ADMIN',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling RoleAssigned event', {
        error: 'Logging error',
        userId: 'user-123',
        roleId: 'role-456',
      });

      errorSpy.mockRestore();
    });

    it('Given: non-Error thrown When: handling event Then: should handle gracefully', async () => {
      // Arrange
      const event = new RoleAssignedEvent(
        'user-123',
        'role-456',
        'SUPERVISOR',
        'admin-789',
        'org-123'
      );

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling RoleAssigned event', {
        error: 'Unknown error',
        userId: 'user-123',
        roleId: 'role-456',
      });

      errorSpy.mockRestore();
    });
  });
});
