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

    it('Given: invalid username format When: checking if can change username Then: should return invalid and early return', async () => {
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
        'ab', // too short
        usernameExists
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('username'))).toBe(true);
    });

    it('Given: same username (case-insensitive match) When: checking Then: should return valid even if exists', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'myusername',
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
        'myusername',
        usernameExists
      );

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUserCreation - additional branches', () => {
    it('Given: first name too short (1 char) When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'A',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name must be at least 2 characters'))).toBe(
        true
      );
    });

    it('Given: first name too long (>100 chars) When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'A'.repeat(101),
        lastName: 'User',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name must be at most 100 characters'))).toBe(
        true
      );
    });

    it('Given: empty last name When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: '',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name is required'))).toBe(true);
    });

    it('Given: last name too short (1 char) When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'U',
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name must be at least 2 characters'))).toBe(
        true
      );
    });

    it('Given: last name too long (>100 chars) When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'U'.repeat(101),
        password: 'SecurePass123!',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name must be at most 100 characters'))).toBe(
        true
      );
    });

    it('Given: empty password When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: '',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Password is required'))).toBe(true);
    });

    it('Given: password too long (>128 chars) When: validating creation Then: should return error', () => {
      // Arrange
      const data = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'A'.repeat(129),
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Password must be at most 128 characters'))).toBe(
        true
      );
    });

    it('Given: multiple validation errors When: validating creation Then: should return all errors', () => {
      // Arrange
      const data = {
        email: 'invalid-email',
        username: 'ab',
        firstName: '',
        lastName: '',
        password: 'short',
      };

      // Act
      const result = UserManagementService.validateUserCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateUserUpdate - additional branches', () => {
    it('Given: invalid username in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        username: 'ab', // too short
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('username'))).toBe(true);
    });

    it('Given: empty first name in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        firstName: '',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name cannot be empty'))).toBe(true);
    });

    it('Given: first name too short in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        firstName: 'A',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name must be at least 2 characters'))).toBe(
        true
      );
    });

    it('Given: first name too long in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        firstName: 'A'.repeat(101),
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('First name must be at most 100 characters'))).toBe(
        true
      );
    });

    it('Given: empty last name in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        lastName: '',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name cannot be empty'))).toBe(true);
    });

    it('Given: last name too short in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        lastName: 'A',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name must be at least 2 characters'))).toBe(
        true
      );
    });

    it('Given: last name too long in update When: validating update Then: should return error', () => {
      // Arrange
      const data = {
        lastName: 'A'.repeat(101),
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Last name must be at most 100 characters'))).toBe(
        true
      );
    });

    it('Given: no fields provided When: validating update Then: should return valid', () => {
      // Arrange
      const data = {};

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: valid email in update When: validating update Then: should return valid', () => {
      // Arrange
      const data = {
        email: 'valid@example.com',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('Given: valid username in update When: validating update Then: should return valid', () => {
      // Arrange
      const data = {
        username: 'validusername',
      };

      // Act
      const result = UserManagementService.validateUserUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('canUserBeDeactivated - additional branches', () => {
    it('Given: locked user When: checking if can be deactivated Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeDeactivated(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Cannot deactivate locked user'))).toBe(true);
    });
  });

  describe('canUserBeActivated - additional branches', () => {
    it('Given: locked user When: checking if can be activated Then: should return valid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const result = UserManagementService.canUserBeActivated(user);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('canUserBeLocked - additional branches', () => {
    it('Given: locked user with lockedUntil set When: checking if can be locked Then: should return already locked', () => {
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
      // Lock the user to set status=LOCKED and lockedUntil
      user.lock(60);

      // Act
      const result = UserManagementService.canUserBeLocked(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already locked'))).toBe(true);
    });

    it('Given: inactive user When: checking if can be locked Then: should return valid', () => {
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
      const result = UserManagementService.canUserBeLocked(user, mockCurrentUserId);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('canUserBeUnlocked', () => {
    it('Given: locked user with lockedUntil set When: checking if can be unlocked Then: should return valid', () => {
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
      user.lock(60); // sets status to LOCKED and lockedUntil in the future

      // Act
      const result = UserManagementService.canUserBeUnlocked(user);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('Given: active user When: checking if can be unlocked Then: should return invalid', () => {
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
      const result = UserManagementService.canUserBeUnlocked(user);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('User is not locked'))).toBe(true);
    });

    it('Given: inactive user When: checking if can be unlocked Then: should return invalid', () => {
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
      const result = UserManagementService.canUserBeUnlocked(user);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('User is not locked'))).toBe(true);
    });

    it('Given: locked status but no lockedUntil When: checking if can be unlocked Then: should return invalid', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      // Status is LOCKED but lockedUntil is not set, so isLocked() returns false

      // Act
      const result = UserManagementService.canUserBeUnlocked(user);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('User is not locked'))).toBe(true);
    });
  });

  describe('canChangeEmail - additional branches', () => {
    it('Given: invalid email format When: checking if can change email Then: should return invalid and early return', async () => {
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
      const result = await UserManagementService.canChangeEmail(user, 'invalid-email', emailExists);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid email'))).toBe(true);
    });

    it('Given: same email (case-insensitive match) When: checking Then: should return valid even if exists', async () => {
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

      const emailExists = async (_email: string, _orgId: string) => true;

      // Act
      const result = await UserManagementService.canChangeEmail(
        user,
        'test@example.com',
        emailExists
      );

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('Given: email does not exist When: checking if can change email Then: should return valid', async () => {
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
        'brand-new@example.com',
        emailExists
      );

      // Assert
      expect(result.isValid).toBe(true);
    });
  });
});
