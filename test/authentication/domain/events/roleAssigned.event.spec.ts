import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { describe, expect, it } from '@jest/globals';

describe('RoleAssignedEvent', () => {
  const mockUserId = 'user-123';
  const mockRoleId = 'role-123';
  const mockRoleName = 'ADMIN';
  const mockAssignedBy = 'admin-456';
  const mockOrgId = 'org-789';

  describe('constructor', () => {
    it('Given: valid event data When: creating event Then: should create successfully', () => {
      // Arrange & Act
      const event = new RoleAssignedEvent(
        mockUserId,
        mockRoleId,
        mockRoleName,
        mockAssignedBy,
        mockOrgId
      );

      // Assert
      expect(event).toBeInstanceOf(RoleAssignedEvent);
      expect(event.userId).toBe(mockUserId);
      expect(event.roleId).toBe(mockRoleId);
      expect(event.roleName).toBe(mockRoleName);
      expect(event.assignedBy).toBe(mockAssignedBy);
      expect(event.orgId).toBe(mockOrgId);
    });
  });

  describe('eventName', () => {
    it('Given: role assigned event When: getting event name Then: should return RoleAssigned', () => {
      // Arrange
      const event = new RoleAssignedEvent(
        mockUserId,
        mockRoleId,
        mockRoleName,
        mockAssignedBy,
        mockOrgId
      );

      // Act & Assert
      expect(event.eventName).toBe('RoleAssigned');
    });
  });

  describe('occurredOn', () => {
    it('Given: role assigned event When: getting occurred on date Then: should return current date', () => {
      // Arrange
      const beforeCreation = new Date();
      const event = new RoleAssignedEvent(
        mockUserId,
        mockRoleId,
        mockRoleName,
        mockAssignedBy,
        mockOrgId
      );
      const afterCreation = new Date();

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('getters', () => {
    it('Given: role assigned event When: accessing properties Then: should return correct values', () => {
      // Arrange
      const event = new RoleAssignedEvent(
        mockUserId,
        mockRoleId,
        mockRoleName,
        mockAssignedBy,
        mockOrgId
      );

      // Act & Assert
      expect(event.userId).toBe(mockUserId);
      expect(event.roleId).toBe(mockRoleId);
      expect(event.roleName).toBe(mockRoleName);
      expect(event.assignedBy).toBe(mockAssignedBy);
      expect(event.orgId).toBe(mockOrgId);
    });
  });
});
