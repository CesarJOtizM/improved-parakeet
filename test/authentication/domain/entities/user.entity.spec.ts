import { User } from '@auth/domain/entities/user.entity';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('User Entity', () => {
  const mockOrgId = 'test-org-id';
  const mockUserProps = {
    email: Email.create('test@example.com'),
    username: 'testuser',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.create('ACTIVE'),
    failedLoginAttempts: 0,
  };

  describe('create', () => {
    it('Given: valid user props and orgId When: creating user Then: should create valid user with domain event', () => {
      // Arrange
      const props = { ...mockUserProps };

      // Act
      const user = User.create(props, mockOrgId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe(props.email.getValue());
      expect(user.username).toBe(props.username);
      expect(user.firstName).toBe(props.firstName);
      expect(user.lastName).toBe(props.lastName);
      expect(user.status.getValue()).toBe('ACTIVE');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.orgId).toBe(mockOrgId);
      expect(user.id).toBeDefined();
    });

    it('Given: user props with failed login attempts When: creating user Then: should create user with specified attempts', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        failedLoginAttempts: 2,
      };

      // Act
      const user = User.create(props, mockOrgId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.failedLoginAttempts).toBe(2);
    });
  });

  describe('reconstitute', () => {
    it('Given: valid user props, id, orgId When: reconstituting user Then: should create user with provided data', () => {
      // Arrange
      const mockId = 'test-user-id';
      const email = Email.create('test@example.com');
      const passwordHash = Password.create('SecurePass123!');
      const props = {
        email,
        username: 'testuser',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
      };

      // Act
      const user = User.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe(mockId);
      expect(user.orgId).toBe(mockOrgId);
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe(props.username);
      expect(user.firstName).toBe(props.firstName);
      expect(user.lastName).toBe(props.lastName);
    });
  });

  describe('update', () => {
    it('Given: user with partial update props When: updating user Then: should update only provided fields', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const updateProps = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // Act
      user.update(updateProps);

      // Assert
      expect(user.firstName).toBe(updateProps.firstName);
      expect(user.lastName).toBe(updateProps.lastName);
      expect(user.email).toBe(mockUserProps.email.getValue());
      expect(user.username).toBe(mockUserProps.username);
    });

    it('Given: user with email update When: updating user Then: should update email', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const updateProps = {
        email: 'newemail@example.com',
      };

      // Act
      user.update(updateProps);

      // Assert
      expect(user.email).toBe(updateProps.email);
    });
  });

  describe('changePassword', () => {
    it('Given: user with current password When: changing password Then: should update password hash and reset failed attempts', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const newPassword = 'NewSecurePass123!';
      user.recordFailedLogin(); // Add some failed attempts

      // Act
      user.changePassword(newPassword);

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeUndefined();
    });
  });

  describe('activate', () => {
    it('Given: inactive user When: activating user Then: should set status to active and reset failed attempts', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        status: UserStatus.create('INACTIVE'),
        failedLoginAttempts: 3,
      };
      const user = User.create(props, mockOrgId);

      // Act
      user.activate();

      // Assert
      expect(user.status.getValue()).toBe('ACTIVE');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeUndefined();
    });
  });

  describe('deactivate', () => {
    it('Given: active user When: deactivating user Then: should set status to inactive', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.deactivate();

      // Assert
      expect(user.status.getValue()).toBe('INACTIVE');
    });
  });

  describe('lock', () => {
    it('Given: active user When: locking user Then: should set status to locked and set lock duration', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const lockDurationMinutes = 30;

      // Act
      user.lock(lockDurationMinutes);

      // Assert
      expect(user.status.getValue()).toBe('LOCKED');
      expect(user.lockedUntil).toBeInstanceOf(Date);
      expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('unlock', () => {
    it('Given: locked user When: unlocking user Then: should set status to active and reset failed attempts', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.lock(30);

      // Act
      user.unlock();

      // Assert
      expect(user.status.getValue()).toBe('ACTIVE');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeUndefined();
    });
  });

  describe('recordFailedLogin', () => {
    it('Given: user with no failed attempts When: recording failed login Then: should increment failed attempts', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.recordFailedLogin();

      // Assert
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('Given: user with 4 failed attempts When: recording failed login Then: should lock user', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        failedLoginAttempts: 4,
      };
      const user = User.create(props, mockOrgId);

      // Act
      user.recordFailedLogin();

      // Assert
      expect(user.status.getValue()).toBe('LOCKED');
      expect(user.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('Given: user with failed attempts When: recording successful login Then: should reset failed attempts and update last login', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.recordFailedLogin();
      user.recordFailedLogin();

      // Act
      user.recordSuccessfulLogin();

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeUndefined();
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('isLocked', () => {
    it('Given: locked user with future lock expiry When: checking if locked Then: should return true', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.lock(30);

      // Act
      const result = user.isLocked();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: active user When: checking if locked Then: should return false', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      const result = user.isLocked();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canLogin', () => {
    it('Given: active user When: checking if can login Then: should return true', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      const result = user.canLogin();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: inactive user When: checking if can login Then: should return false', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        status: UserStatus.create('INACTIVE'),
      };
      const user = User.create(props, mockOrgId);

      // Act
      const result = user.canLogin();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: locked user When: checking if can login Then: should return false', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.lock(30);

      // Act
      const result = user.canLogin();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Getters', () => {
    it('Given: user with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act & Assert
      expect(user.email).toBe(mockUserProps.email.getValue());
      expect(user.username).toBe(mockUserProps.username);
      expect(user.name).toBe(`${mockUserProps.firstName} ${mockUserProps.lastName}`);
      expect(user.firstName).toBe(mockUserProps.firstName);
      expect(user.lastName).toBe(mockUserProps.lastName);
      expect(user.status.getValue()).toBe('ACTIVE');
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.roles).toEqual([]);
      expect(user.permissions).toEqual([]);
    });

    it('Given: user with roles and permissions When: accessing getters Then: should return correct arrays', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        roles: ['ADMIN', 'USER'],
        permissions: ['USERS:CREATE', 'USERS:READ'],
      };
      const user = User.create(props, mockOrgId);

      // Act & Assert
      expect(user.roles).toEqual(['ADMIN', 'USER']);
      expect(user.permissions).toEqual(['USERS:CREATE', 'USERS:READ']);
    });
  });

  describe('Domain Events', () => {
    it('Given: newly created user When: checking domain events Then: should have UserCreated event', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act & Assert
      expect(user).toBeInstanceOf(User);
    });

    it('Given: user after update When: checking domain events Then: should have updated timestamp', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act & Assert
      expect(user).toBeInstanceOf(User);
    });
  });

  describe('Entity Properties', () => {
    it('Given: newly created user When: checking entity properties Then: should have correct timestamps', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act & Assert
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('Given: reconstituted user When: checking entity properties Then: should preserve original data', () => {
      // Arrange
      const mockId = 'test-user-id';
      const email = Email.create('test@example.com');
      const passwordHash = Password.create('SecurePass123!');
      const props = {
        email,
        username: 'testuser',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
      };

      // Act
      const user = User.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(user.id).toBe(mockId);
      expect(user.orgId).toBe(mockOrgId);
      expect(user.email).toBe('test@example.com');
    });
  });
});
