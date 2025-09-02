import { Role } from '@auth/domain/entities/role.entity';
import { RoleUpdatedEvent } from '@auth/domain/events/roleUpdated.event';

describe('RoleUpdatedEvent', () => {
  const mockOrgId = 'test-org-id';
  const mockRole = Role.create(
    {
      name: 'ADMIN',
      description: 'Administrator role',
      isActive: true,
    },
    mockOrgId
  );

  describe('constructor', () => {
    it('Given: valid role When: creating event Then: should create event with correct properties', () => {
      // Act
      const event = new RoleUpdatedEvent(mockRole);

      // Assert
      expect(event).toBeInstanceOf(RoleUpdatedEvent);
      expect(event.eventName).toBe('RoleUpdated');
      expect(event.roleId).toBe(mockRole.id);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.roleName).toBe('ADMIN');
      expect(event.description).toBe('Administrator role');
      expect(event.isActive).toBe(true);
    });

    it('Given: inactive role When: creating event Then: should create event with inactive status', () => {
      // Arrange
      const inactiveRole = Role.create(
        {
          name: 'USER',
          description: 'Regular user role',
          isActive: false,
        },
        mockOrgId
      );

      // Act
      const event = new RoleUpdatedEvent(inactiveRole);

      // Assert
      expect(event.isActive).toBe(false);
    });

    it('Given: role without description When: creating event Then: should create event with undefined description', () => {
      // Arrange
      const roleWithoutDescription = Role.create(
        {
          name: 'MODERATOR',
          isActive: true,
        },
        mockOrgId
      );

      // Act
      const event = new RoleUpdatedEvent(roleWithoutDescription);

      // Assert
      expect(event.description).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: role updated event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('RoleUpdated');
    });
  });

  describe('occurredOn', () => {
    it('Given: role updated event When: getting occurred on date Then: should return role updated at', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(mockRole.updatedAt);
    });
  });

  describe('roleId', () => {
    it('Given: role updated event When: getting role id Then: should return role id', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const roleId = event.roleId;

      // Assert
      expect(roleId).toBe(mockRole.id);
    });
  });

  describe('orgId', () => {
    it('Given: role updated event When: getting org id Then: should return role org id', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('roleName', () => {
    it('Given: role updated event When: getting role name Then: should return role name', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const roleName = event.roleName;

      // Assert
      expect(roleName).toBe('ADMIN');
    });
  });

  describe('description', () => {
    it('Given: role updated event with description When: getting description Then: should return role description', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const description = event.description;

      // Assert
      expect(description).toBe('Administrator role');
    });

    it('Given: role updated event without description When: getting description Then: should return undefined', () => {
      // Arrange
      const roleWithoutDescription = Role.create(
        {
          name: 'USER',
          isActive: true,
        },
        mockOrgId
      );
      const event = new RoleUpdatedEvent(roleWithoutDescription);

      // Act
      const description = event.description;

      // Assert
      expect(description).toBeUndefined();
    });
  });

  describe('isActive', () => {
    it('Given: active role updated event When: getting is active Then: should return true', () => {
      // Arrange
      const event = new RoleUpdatedEvent(mockRole);

      // Act
      const isActive = event.isActive;

      // Assert
      expect(isActive).toBe(true);
    });

    it('Given: inactive role updated event When: getting is active Then: should return false', () => {
      // Arrange
      const inactiveRole = Role.create(
        {
          name: 'USER',
          description: 'Regular user role',
          isActive: false,
        },
        mockOrgId
      );
      const event = new RoleUpdatedEvent(inactiveRole);

      // Act
      const isActive = event.isActive;

      // Assert
      expect(isActive).toBe(false);
    });
  });
});
