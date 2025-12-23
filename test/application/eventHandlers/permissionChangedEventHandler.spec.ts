/* eslint-disable @typescript-eslint/no-explicit-any */
import { PermissionChangedEventHandler } from '@application/eventHandlers/permissionChangedEventHandler';
import { Permission } from '@auth/domain/entities/permission.entity';
import { PermissionChangedEvent } from '@auth/domain/events/permissionChanged.event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('PermissionChangedEventHandler', () => {
  let handler: PermissionChangedEventHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    handler = new PermissionChangedEventHandler();
    // Spy on logger methods
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: PermissionChanged event When: handling event Then: should log audit information', async () => {
      // Arrange
      const permission = Permission.reconstitute(
        {
          name: 'USERS:CREATE',
          description: 'Create users',
          module: 'USERS',
          action: 'CREATE',
        },
        'perm-123',
        'org-123'
      );
      const event = new PermissionChangedEvent(permission, 'CREATED', 'admin-789');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling PermissionChanged event', {
        permissionId: 'perm-123',
        permissionName: 'USERS:CREATE',
        changeType: 'CREATED',
        changedBy: 'admin-789',
        orgId: 'org-123',
        occurredOn: expect.any(String),
      });

      expect(loggerSpy).toHaveBeenCalledWith('[AUDIT] Permission changed', {
        entityType: 'Permission',
        entityId: 'perm-123',
        action: 'PERMISSION_CREATED',
        performedBy: 'admin-789',
        orgId: 'org-123',
        metadata: {
          permissionName: 'USERS:CREATE',
          module: 'USERS',
          action: 'CREATE',
          changeType: 'CREATED',
          changedAt: expect.any(String),
        },
      });
    });

    it('Given: PermissionChanged event with DELETED type When: handling event Then: should log correct action', async () => {
      // Arrange
      const permission = Permission.reconstitute(
        {
          name: 'USERS:DELETE',
          description: 'Delete users',
          module: 'USERS',
          action: 'DELETE',
        },
        'perm-123',
        'org-123'
      );
      const event = new PermissionChangedEvent(permission, 'DELETED', 'admin-789');

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('[AUDIT] Permission changed', {
        entityType: 'Permission',
        entityId: 'perm-123',
        action: 'PERMISSION_DELETED',
        performedBy: 'admin-789',
        orgId: 'org-123',
        metadata: {
          permissionName: 'USERS:DELETE',
          module: 'USERS',
          action: 'DELETE',
          changeType: 'DELETED',
          changedAt: expect.any(String),
        },
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const permission = Permission.reconstitute(
        {
          name: 'USERS:CREATE',
          description: 'Create users',
          module: 'USERS',
          action: 'CREATE',
        },
        'perm-123',
        'org-123'
      );
      const event = new PermissionChangedEvent(permission, 'CREATED', 'admin-789');

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

      // Act
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling PermissionChanged event', {
        error: 'Logging error',
        permissionId: 'perm-123',
        changeType: 'CREATED',
      });

      errorSpy.mockRestore();
    });
  });
});
