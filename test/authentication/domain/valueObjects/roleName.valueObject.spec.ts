import { RoleName } from '@auth/domain/valueObjects/roleName.valueObject';
import { describe, expect, it } from '@jest/globals';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';

describe('RoleName Value Object', () => {
  describe('create', () => {
    it('Given: valid uppercase role name When: creating role name Then: should create successfully', () => {
      // Arrange & Act
      const roleName = RoleName.create('ADMIN');

      // Assert
      expect(roleName).toBeInstanceOf(RoleName);
      expect(roleName.getValue()).toBe('ADMIN');
    });

    it('Given: lowercase role name When: creating role name Then: should convert to uppercase', () => {
      // Arrange & Act
      const roleName = RoleName.create('admin');

      // Assert
      expect(roleName.getValue()).toBe('ADMIN');
    });

    it('Given: role name with spaces When: creating role name Then: should trim spaces', () => {
      // Arrange & Act
      const roleName = RoleName.create('  ADMIN  ');

      // Assert
      expect(roleName.getValue()).toBe('ADMIN');
    });

    it('Given: empty role name When: creating role name Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => RoleName.create('')).toThrow('Role name cannot be empty');
      expect(() => RoleName.create('   ')).toThrow('Role name cannot be empty');
    });

    it('Given: lowercase role name When: creating role name Then: should convert to uppercase', () => {
      // Arrange & Act
      const roleName = RoleName.create('admin');

      // Assert
      expect(roleName.getValue()).toBe('ADMIN');
    });

    it('Given: role name not in snake_case format When: creating role name Then: should throw error', () => {
      // Arrange & Act & Assert
      // After conversion to uppercase, these become invalid format (no underscores, contains lowercase after conversion check)
      expect(() => RoleName.create('admin-role')).toThrow(
        'Role name must be in UPPER_SNAKE_CASE format'
      );
      expect(() => RoleName.create('admin.role')).toThrow(
        'Role name must be in UPPER_SNAKE_CASE format'
      );
      // ADMINROLE passes regex but fails uppercase check if we pass lowercase
      // Actually, let's test with something that definitely fails the regex
      expect(() => RoleName.create('ADMIN-ROLE')).toThrow(
        'Role name must be in UPPER_SNAKE_CASE format'
      );
    });

    it('Given: role name starting with underscore When: creating role name Then: should throw error', () => {
      // Arrange & Act & Assert
      // The regex validation catches this first, so it throws format error
      expect(() => RoleName.create('_ADMIN')).toThrow(
        'Role name must be in UPPER_SNAKE_CASE format'
      );
    });

    it('Given: role name ending with underscore When: creating role name Then: should throw error', () => {
      // Arrange & Act & Assert
      // The regex validation catches this first, so it throws format error
      expect(() => RoleName.create('ADMIN_')).toThrow(
        'Role name must be in UPPER_SNAKE_CASE format'
      );
    });

    it('Given: role name with consecutive underscores When: creating role name Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => RoleName.create('ADMIN__ROLE')).toThrow(
        'Role name cannot have consecutive underscores'
      );
    });

    it('Given: valid system role When: creating role name Then: should create successfully', () => {
      // Arrange & Act
      const roleName = RoleName.create(SYSTEM_ROLES.ADMIN);

      // Assert
      expect(roleName.getValue()).toBe(SYSTEM_ROLES.ADMIN);
    });

    it('Given: valid custom role in snake_case When: creating role name Then: should create successfully', () => {
      // Arrange & Act
      const roleName = RoleName.create('CUSTOM_ROLE');

      // Assert
      expect(roleName.getValue()).toBe('CUSTOM_ROLE');
    });

    it('Given: role name longer than 50 characters When: creating role name Then: should throw error', () => {
      // Arrange
      const longRoleName = 'A'.repeat(51);

      // Act & Assert
      expect(() => RoleName.create(longRoleName)).toThrow(
        'Role name must be at most 50 characters long'
      );
    });
  });

  describe('isSystemRole', () => {
    it('Given: system role When: checking if system role Then: should return true', () => {
      // Arrange
      const roleName = RoleName.create(SYSTEM_ROLES.ADMIN);

      // Act & Assert
      expect(roleName.isSystemRole()).toBe(true);
    });

    it('Given: custom role When: checking if system role Then: should return false', () => {
      // Arrange
      const roleName = RoleName.create('CUSTOM_ROLE');

      // Act & Assert
      expect(roleName.isSystemRole()).toBe(false);
    });
  });

  describe('equals', () => {
    it('Given: two role names with same value When: comparing Then: should return true', () => {
      // Arrange
      const roleName1 = RoleName.create('ADMIN');
      const roleName2 = RoleName.create('ADMIN');

      // Act & Assert
      expect(roleName1.equals(roleName2)).toBe(true);
    });

    it('Given: two role names with different values When: comparing Then: should return false', () => {
      // Arrange
      const roleName1 = RoleName.create('ADMIN');
      const roleName2 = RoleName.create('SUPERVISOR');

      // Act & Assert
      expect(roleName1.equals(roleName2)).toBe(false);
    });

    it('Given: role name and undefined When: comparing Then: should return false', () => {
      // Arrange
      const roleName = RoleName.create('ADMIN');

      // Act & Assert
      expect(roleName.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: role name When: converting to string Then: should return value', () => {
      // Arrange
      const roleName = RoleName.create('ADMIN');

      // Act & Assert
      expect(roleName.toString()).toBe('ADMIN');
    });
  });
});
