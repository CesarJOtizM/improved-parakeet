import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('UserStatus', () => {
  describe('create', () => {
    it('Given: valid ACTIVE status When: creating user status Then: should create status instance', () => {
      // Act
      const status = UserStatus.create('ACTIVE');

      // Assert
      expect(status).toBeInstanceOf(UserStatus);
      expect(status.getValue()).toBe('ACTIVE');
      expect(status.isActive()).toBe(true);
      expect(status.isInactive()).toBe(false);
      expect(status.isLocked()).toBe(false);
      expect(status.canLogin()).toBe(true);
    });

    it('Given: valid INACTIVE status When: creating user status Then: should create status instance', () => {
      // Act
      const status = UserStatus.create('INACTIVE');

      // Assert
      expect(status).toBeInstanceOf(UserStatus);
      expect(status.getValue()).toBe('INACTIVE');
      expect(status.isActive()).toBe(false);
      expect(status.isInactive()).toBe(true);
      expect(status.isLocked()).toBe(false);
      expect(status.canLogin()).toBe(false);
    });

    it('Given: valid LOCKED status When: creating user status Then: should create status instance', () => {
      // Act
      const status = UserStatus.create('LOCKED');

      // Assert
      expect(status).toBeInstanceOf(UserStatus);
      expect(status.getValue()).toBe('LOCKED');
      expect(status.isActive()).toBe(false);
      expect(status.isInactive()).toBe(false);
      expect(status.isLocked()).toBe(true);
      expect(status.canLogin()).toBe(false);
    });

    it('Given: invalid status When: creating user status Then: should throw error', () => {
      // Arrange
      const invalidStatuses = ['PENDING', 'SUSPENDED', 'DELETED', ''];

      // Act & Assert
      invalidStatuses.forEach(invalidStatus => {
        expect(() => UserStatus.create(invalidStatus as 'ACTIVE' | 'INACTIVE' | 'LOCKED')).toThrow(
          `Invalid user status: ${invalidStatus}`
        );
      });
    });

    it('Given: case sensitive status When: creating user status Then: should throw error for lowercase', () => {
      // Act & Assert
      expect(() => UserStatus.create('active' as 'ACTIVE' | 'INACTIVE' | 'LOCKED')).toThrow(
        'Invalid user status: active'
      );
    });
  });

  describe('isActive', () => {
    it('Given: ACTIVE status When: checking if active Then: should return true', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const isActive = status.isActive();

      // Assert
      expect(isActive).toBe(true);
    });

    it('Given: INACTIVE status When: checking if active Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const isActive = status.isActive();

      // Assert
      expect(isActive).toBe(false);
    });

    it('Given: LOCKED status When: checking if active Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const isActive = status.isActive();

      // Assert
      expect(isActive).toBe(false);
    });
  });

  describe('isInactive', () => {
    it('Given: INACTIVE status When: checking if inactive Then: should return true', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const isInactive = status.isInactive();

      // Assert
      expect(isInactive).toBe(true);
    });

    it('Given: ACTIVE status When: checking if inactive Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const isInactive = status.isInactive();

      // Assert
      expect(isInactive).toBe(false);
    });

    it('Given: LOCKED status When: checking if inactive Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const isInactive = status.isInactive();

      // Assert
      expect(isInactive).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('Given: LOCKED status When: checking if locked Then: should return true', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const isLocked = status.isLocked();

      // Assert
      expect(isLocked).toBe(true);
    });

    it('Given: ACTIVE status When: checking if locked Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const isLocked = status.isLocked();

      // Assert
      expect(isLocked).toBe(false);
    });

    it('Given: INACTIVE status When: checking if locked Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const isLocked = status.isLocked();

      // Assert
      expect(isLocked).toBe(false);
    });
  });

  describe('canLogin', () => {
    it('Given: ACTIVE status When: checking if can login Then: should return true', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const canLogin = status.canLogin();

      // Assert
      expect(canLogin).toBe(true);
    });

    it('Given: INACTIVE status When: checking if can login Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const canLogin = status.canLogin();

      // Assert
      expect(canLogin).toBe(false);
    });

    it('Given: LOCKED status When: checking if can login Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const canLogin = status.canLogin();

      // Assert
      expect(canLogin).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: ACTIVE status When: getting value Then: should return ACTIVE', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const value = status.getValue();

      // Assert
      expect(value).toBe('ACTIVE');
    });

    it('Given: INACTIVE status When: getting value Then: should return INACTIVE', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const value = status.getValue();

      // Assert
      expect(value).toBe('INACTIVE');
    });

    it('Given: LOCKED status When: getting value Then: should return LOCKED', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const value = status.getValue();

      // Assert
      expect(value).toBe('LOCKED');
    });
  });

  describe('equals', () => {
    it('Given: two ACTIVE statuses When: comparing Then: should return true', () => {
      // Arrange
      const status1 = UserStatus.create('ACTIVE');
      const status2 = UserStatus.create('ACTIVE');

      // Act
      const areEqual = status1.equals(status2);

      // Assert
      expect(areEqual).toBe(true);
    });

    it('Given: ACTIVE and INACTIVE statuses When: comparing Then: should return false', () => {
      // Arrange
      const status1 = UserStatus.create('ACTIVE');
      const status2 = UserStatus.create('INACTIVE');

      // Act
      const areEqual = status1.equals(status2);

      // Assert
      expect(areEqual).toBe(false);
    });

    it('Given: status and null When: comparing Then: should return false', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const areEqual = status.equals(undefined);

      // Assert
      expect(areEqual).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: ACTIVE status When: converting to string Then: should return ACTIVE', () => {
      // Arrange
      const status = UserStatus.create('ACTIVE');

      // Act
      const stringValue = status.toString();

      // Assert
      expect(stringValue).toBe('ACTIVE');
    });

    it('Given: INACTIVE status When: converting to string Then: should return INACTIVE', () => {
      // Arrange
      const status = UserStatus.create('INACTIVE');

      // Act
      const stringValue = status.toString();

      // Assert
      expect(stringValue).toBe('INACTIVE');
    });

    it('Given: LOCKED status When: converting to string Then: should return LOCKED', () => {
      // Arrange
      const status = UserStatus.create('LOCKED');

      // Act
      const stringValue = status.toString();

      // Assert
      expect(stringValue).toBe('LOCKED');
    });
  });
});
