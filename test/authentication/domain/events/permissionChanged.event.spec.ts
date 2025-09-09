import { Permission } from '@auth/domain/entities/permission.entity';
import { PermissionChangedEvent } from '@auth/domain/events/permissionChanged.event';

describe('PermissionChangedEvent', () => {
  const mockOrgId = 'test-org-id';
  const mockPermission = Permission.create(
    {
      name: 'users:read',
      description: 'Read users permission',
      module: 'users',
      action: 'read',
    },
    mockOrgId
  );

  describe('constructor', () => {
    it('Given: valid permission and change type When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const changeType = 'CREATED' as const;
      const changedBy = 'admin-user';

      // Act
      const event = new PermissionChangedEvent(mockPermission, changeType, changedBy);

      // Assert
      expect(event).toBeInstanceOf(PermissionChangedEvent);
      expect(event.eventName).toBe('PermissionChanged');
      expect(event.permissionId).toBe(mockPermission.id);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.permissionName).toBe('users:read');
      expect(event.module).toBe('users');
      expect(event.action).toBe('read');
      expect(event.changeType).toBe(changeType);
      expect(event.changedBy).toBe(changedBy);
    });

    it('Given: permission with updated change type When: creating event Then: should create event with updated type', () => {
      // Arrange
      const changeType = 'UPDATED' as const;
      const changedBy = 'moderator-user';

      // Act
      const event = new PermissionChangedEvent(mockPermission, changeType, changedBy);

      // Assert
      expect(event.changeType).toBe(changeType);
      expect(event.changedBy).toBe(changedBy);
    });

    it('Given: permission with deleted change type When: creating event Then: should create event with deleted type', () => {
      // Arrange
      const changeType = 'DELETED' as const;
      const changedBy = 'system';

      // Act
      const event = new PermissionChangedEvent(mockPermission, changeType, changedBy);

      // Assert
      expect(event.changeType).toBe(changeType);
      expect(event.changedBy).toBe(changedBy);
    });
  });

  describe('eventName', () => {
    it('Given: permission changed event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('PermissionChanged');
    });
  });

  describe('occurredOn', () => {
    it('Given: permission changed event When: getting occurred on date Then: should return permission updated at', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(mockPermission.updatedAt);
    });
  });

  describe('permissionId', () => {
    it('Given: permission changed event When: getting permission id Then: should return permission id', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const permissionId = event.permissionId;

      // Assert
      expect(permissionId).toBe(mockPermission.id);
    });
  });

  describe('orgId', () => {
    it('Given: permission changed event When: getting org id Then: should return permission org id', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('permissionName', () => {
    it('Given: permission changed event When: getting permission name Then: should return permission name', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const permissionName = event.permissionName;

      // Assert
      expect(permissionName).toBe('users:read');
    });
  });

  describe('module', () => {
    it('Given: permission changed event When: getting module Then: should return permission module', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const module = event.module;

      // Assert
      expect(module).toBe('users');
    });
  });

  describe('action', () => {
    it('Given: permission changed event When: getting action Then: should return permission action', () => {
      // Arrange
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', 'admin');

      // Act
      const action = event.action;

      // Assert
      expect(action).toBe('read');
    });
  });

  describe('changeType', () => {
    it('Given: permission changed event When: getting change type Then: should return correct change type', () => {
      // Arrange
      const changeType = 'UPDATED' as const;
      const event = new PermissionChangedEvent(mockPermission, changeType, 'admin');

      // Act
      const result = event.changeType;

      // Assert
      expect(result).toBe(changeType);
    });
  });

  describe('changedBy', () => {
    it('Given: permission changed event When: getting changed by Then: should return correct user', () => {
      // Arrange
      const changedBy = 'admin-user';
      const event = new PermissionChangedEvent(mockPermission, 'CREATED', changedBy);

      // Act
      const result = event.changedBy;

      // Assert
      expect(result).toBe(changedBy);
    });
  });
});
