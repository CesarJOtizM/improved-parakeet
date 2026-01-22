import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
import { describe, expect, it } from '@jest/globals';

describe('UserStatusChangedEvent', () => {
  const mockUserId = 'user-123';
  const mockOldStatus = 'ACTIVE' as const;
  const mockNewStatus = 'INACTIVE' as const;
  const mockChangedBy = 'admin-456';
  const mockOrgId = 'org-789';
  const mockReason = 'User requested deactivation';

  describe('constructor', () => {
    it('Given: valid event data When: creating event Then: should create successfully', () => {
      // Arrange & Act
      const event = new UserStatusChangedEvent(
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockChangedBy,
        mockOrgId,
        mockReason
      );

      // Assert
      expect(event).toBeInstanceOf(UserStatusChangedEvent);
      expect(event.userId).toBe(mockUserId);
      expect(event.oldStatus).toBe(mockOldStatus);
      expect(event.newStatus).toBe(mockNewStatus);
      expect(event.changedBy).toBe(mockChangedBy);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.reason).toBe(mockReason);
    });

    it('Given: event data without reason When: creating event Then: should create successfully', () => {
      // Arrange & Act
      const event = new UserStatusChangedEvent(
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockChangedBy,
        mockOrgId
      );

      // Assert
      expect(event).toBeInstanceOf(UserStatusChangedEvent);
      expect(event.reason).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: user status changed event When: getting event name Then: should return UserStatusChanged', () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockChangedBy,
        mockOrgId
      );

      // Act & Assert
      expect(event.eventName).toBe('UserStatusChanged');
    });
  });

  describe('occurredOn', () => {
    it('Given: user status changed event When: getting occurred on date Then: should return current date', () => {
      // Arrange
      const beforeCreation = new Date();
      const event = new UserStatusChangedEvent(
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockChangedBy,
        mockOrgId
      );
      const afterCreation = new Date();

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 5);
    });
  });

  describe('getters', () => {
    it('Given: user status changed event When: accessing properties Then: should return correct values', () => {
      // Arrange
      const event = new UserStatusChangedEvent(
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockChangedBy,
        mockOrgId,
        mockReason
      );

      // Act & Assert
      expect(event.userId).toBe(mockUserId);
      expect(event.oldStatus).toBe(mockOldStatus);
      expect(event.newStatus).toBe(mockNewStatus);
      expect(event.changedBy).toBe(mockChangedBy);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.reason).toBe(mockReason);
    });

    it('Given: all status transitions When: creating events Then: should handle all statuses', () => {
      // Arrange & Act & Assert
      const statuses: Array<'ACTIVE' | 'INACTIVE' | 'LOCKED'> = ['ACTIVE', 'INACTIVE', 'LOCKED'];

      statuses.forEach(oldStatus => {
        statuses.forEach(newStatus => {
          const event = new UserStatusChangedEvent(
            mockUserId,
            oldStatus,
            newStatus,
            mockChangedBy,
            mockOrgId
          );

          expect(event.oldStatus).toBe(oldStatus);
          expect(event.newStatus).toBe(newStatus);
        });
      });
    });
  });
});
