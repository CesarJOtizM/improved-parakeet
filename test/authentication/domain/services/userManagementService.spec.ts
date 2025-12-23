import { User } from '@auth/domain/entities/user.entity';
import { UserManagementService } from '@auth/domain/services/userManagementService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('UserManagementService', () => {
  const mockOrgId = 'test-org-id';
  const mockCurrentUserId = 'current-user-id';

  describe('validateUserCreation', () => {
    it('Given: valid user data When: validating creation Then: should return valid', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid email When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        email: 'invalid-email',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('email'))).toBe(true);
    });

    it('Given: invalid username When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'ab', // Too short
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('username'))).toBe(true);
    });

    it('Given: short password When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'short', // Too short
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Password'))).toBe(true);
    });

    it('Given: empty first name When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: '',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name'))).toBe(true);
    });
  });

  describe('validateUserUpdate', () => {
    it('Given: valid update data When: validating update Then: should return valid', () => {
      // Arrange
      const data = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid email in update When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        email: 'invalid-email',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('email'))).toBe(true);
    });
  });

  describe('canUserBeDeactivated', () => {
    it('Given: active user When: checking if can be deactivated Then: should return valid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeDeactivated(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: user trying to deactivate themselves When: checking Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeDeactivated(user, user.id);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('your own account'))).toBe(true);
    });

    it('Given: inactive user When: checking if can be deactivated Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeDeactivated(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already inactive'))).toBe(true);
    });
  });

  describe('canUserBeActivated', () => {
    it('Given: inactive user When: checking if can be activated Then: should return valid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeActivated(user);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: active user When: checking if can be activated Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeActivated(user);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already active'))).toBe(true);
    });
  });

  describe('canUserBeLocked', () => {
    it('Given: active user When: checking if can be locked Then: should return valid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeLocked(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: user trying to lock themselves When: checking Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeLocked(user, user.id);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('your own account'))).toBe(true);
    });
  });

  describe('canChangeEmail', () => {
    it('Given: valid new email When: checking if can change email Then: should return valid', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('old@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const emailExists = async (_email: string, _orgId: string) => false;

      // Act
      const result = await UserManagementService.canChangeEmail(
        user,
        'new@example.com',
        emailExists
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: email already in use When: checking if can change email Then: should return invalid', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('old@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const emailExists = async (_email: string, _orgId: string) => true;

      // Act
      const result = await UserManagementService.canChangeEmail(
        user,
        'taken@example.com',
        emailExists
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already in use'))).toBe(true);
    });
  });

  describe('canChangeUsername', () => {
    it('Given: valid new username When: checking if can change username Then: should return valid', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'oldusername',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const usernameExists = async (_username: string, _orgId: string) => false;

      // Act
      const result = await UserManagementService.canChangeUsername(
        user,
        'newusername',
        usernameExists
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: username already in use When: checking if can change username Then: should return invalid', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'oldusername',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const usernameExists = async (_username: string, _orgId: string) => true;

      // Act
      const result = await UserManagementService.canChangeUsername(
        user,
        'takenusername',
        usernameExists
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already in use'))).toBe(true);
    });
  });
});
