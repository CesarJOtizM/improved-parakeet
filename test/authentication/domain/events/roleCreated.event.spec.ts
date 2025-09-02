import { Role } from '@auth/domain/entities/role.entity';
import { RoleCreatedEvent } from '@auth/domain/events/roleCreated.event';

describe('RoleCreatedEvent', () => {
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
      const event = new RoleCreatedEvent(mockRole);

      // Assert
      expect(event).toBeInstanceOf(RoleCreatedEvent);
      expect(event.eventName).toBe('RoleCreated');
      expect(event.roleId).toBe(mockRole.id);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.roleName).toBe('ADMIN');
      expect(event.description).toBe('Administrator role');
    });

    it('Given: role without description When: creating event Then: should create event with undefined description', () => {
      // Arrange
      const roleWithoutDescription = Role.create(
        {
          name: 'USER',
          isActive: true,
        },
        mockOrgId
      );

      // Act
      const event = new RoleCreatedEvent(roleWithoutDescription);

      // Assert
      expect(event.description).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: role created event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('RoleCreated');
    });
  });

  describe('occurredOn', () => {
    it('Given: role created event When: getting occurred on date Then: should return role created at', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(mockRole.createdAt);
    });
  });

  describe('roleId', () => {
    it('Given: role created event When: getting role id Then: should return role id', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const roleId = event.roleId;

      // Assert
      expect(roleId).toBe(mockRole.id);
    });
  });

  describe('orgId', () => {
    it('Given: role created event When: getting org id Then: should return role org id', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('roleName', () => {
    it('Given: role created event When: getting role name Then: should return role name', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const roleName = event.roleName;

      // Assert
      expect(roleName).toBe('ADMIN');
    });
  });

  describe('description', () => {
    it('Given: role created event with description When: getting description Then: should return role description', () => {
      // Arrange
      const event = new RoleCreatedEvent(mockRole);

      // Act
      const description = event.description;

      // Assert
      expect(description).toBe('Administrator role');
    });

    it('Given: role created event without description When: getting description Then: should return undefined', () => {
      // Arrange
      const roleWithoutDescription = Role.create(
        {
          name: 'USER',
          isActive: true,
        },
        mockOrgId
      );
      const event = new RoleCreatedEvent(roleWithoutDescription);

      // Act
      const description = event.description;

      // Assert
      expect(description).toBeUndefined();
    });
  });
});
