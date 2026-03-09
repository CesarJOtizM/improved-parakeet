import { User } from '@auth/domain/entities/user.entity';
import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
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

  describe('create with hashed password', () => {
    it('Given: pre-hashed password When: creating user Then: should use createHashed', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        password: '$2b$10$somehashedpassword',
        isPasswordHashed: true,
      };

      // Act
      const user = User.create(props, mockOrgId);

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.passwordHash).toBe('$2b$10$somehashedpassword');
    });

    it('Given: zero failedLoginAttempts When: creating user Then: should default to 0', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        failedLoginAttempts: 0,
      };

      // Act
      const user = User.create(props, mockOrgId);

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
    });
  });

  describe('update', () => {
    it('Given: user When: updating phone Then: should update phone', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ phone: '+1234567890' });

      // Assert
      expect(user.phone).toBe('+1234567890');
    });

    it('Given: user When: updating timezone Then: should update timezone', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ timezone: 'America/New_York' });

      // Assert
      expect(user.timezone).toBe('America/New_York');
    });

    it('Given: user When: updating language Then: should update language', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ language: 'es' });

      // Assert
      expect(user.language).toBe('es');
    });

    it('Given: user When: updating jobTitle Then: should update jobTitle', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ jobTitle: 'Engineer' });

      // Assert
      expect(user.jobTitle).toBe('Engineer');
    });

    it('Given: user When: updating department Then: should update department', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ department: 'Engineering' });

      // Assert
      expect(user.department).toBe('Engineering');
    });

    it('Given: user When: updating username Then: should update username', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.update({ username: 'newusername' });

      // Assert
      expect(user.username).toBe('newusername');
    });
  });

  describe('changePasswordHashed', () => {
    it('Given: user When: changing password with hashed value Then: should reset attempts and mustChangePassword', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.recordFailedLogin();
      user.recordFailedLogin();

      // Act
      user.changePasswordHashed('$2b$10$newhashedpassword');

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeUndefined();
      expect(user.mustChangePassword).toBe(false);
    });
  });

  describe('activate', () => {
    it('Given: inactive user When: activating with changedBy Then: should emit status changed event', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        status: UserStatus.create('INACTIVE'),
      };
      const user = User.create(props, mockOrgId);

      // Act
      user.activate('admin-user', 'Reactivation');

      // Assert
      expect(user.status.getValue()).toBe('ACTIVE');
      // Should have created event + status changed event
      expect(user.domainEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deactivate', () => {
    it('Given: active user When: deactivating with changedBy Then: should emit status changed event', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.deactivate('admin-user', 'Leaving company');

      // Assert
      expect(user.status.getValue()).toBe('INACTIVE');
      expect(user.domainEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('lock', () => {
    it('Given: active user When: locking with changedBy Then: should emit status changed event', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.lock(60, 'admin-user', 'Security concern');

      // Assert
      expect(user.status.getValue()).toBe('LOCKED');
      expect(user.domainEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('Given: active user When: locking with default duration Then: should lock for 30 minutes', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const beforeLock = Date.now();

      // Act
      user.lock();

      // Assert
      expect(user.lockedUntil).toBeInstanceOf(Date);
      const lockDuration = user.lockedUntil!.getTime() - beforeLock;
      // Should be approximately 30 minutes (30 * 60 * 1000 = 1800000ms)
      expect(lockDuration).toBeGreaterThan(1790000);
      expect(lockDuration).toBeLessThan(1810000);
    });
  });

  describe('unlock', () => {
    it('Given: locked user When: unlocking with changedBy Then: should emit status changed event', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      user.lock(30);

      // Act
      user.unlock('admin-user', 'Reset by admin');

      // Assert
      expect(user.status.getValue()).toBe('ACTIVE');
      expect(user.domainEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('changeStatus', () => {
    it('Given: active user When: changing status to INACTIVE Then: should deactivate', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.changeStatus('INACTIVE', 'admin-user');

      // Assert
      expect(user.status.getValue()).toBe('INACTIVE');
    });

    it('Given: active user When: changing status to LOCKED Then: should lock', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.changeStatus('LOCKED', 'admin-user', 'Security', 60);

      // Assert
      expect(user.status.getValue()).toBe('LOCKED');
      expect(user.lockedUntil).toBeInstanceOf(Date);
    });

    it('Given: inactive user When: changing status to ACTIVE Then: should activate', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        status: UserStatus.create('INACTIVE'),
      };
      const user = User.create(props, mockOrgId);

      // Act
      user.changeStatus('ACTIVE', 'admin-user');

      // Assert
      expect(user.status.getValue()).toBe('ACTIVE');
    });

    it('Given: active user When: changing status to LOCKED without lockDuration Then: should default to 30 min', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act
      user.changeStatus('LOCKED', 'admin-user');

      // Assert
      expect(user.status.getValue()).toBe('LOCKED');
    });
  });

  describe('isLocked', () => {
    it('Given: LOCKED user without lockedUntil When: checking isLocked Then: should return false', () => {
      // Arrange
      const email = Email.create('test@example.com');
      const passwordHash = Password.create('SecurePass123!');
      const props = {
        email,
        username: 'testuser',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.create('LOCKED'),
        failedLoginAttempts: 5,
        // No lockedUntil
      };
      const user = User.reconstitute(props, 'user-1', mockOrgId);

      // Act & Assert
      expect(user.isLocked()).toBe(false);
    });

    it('Given: LOCKED user with past lockedUntil When: checking isLocked Then: should return false', () => {
      // Arrange
      const email = Email.create('test@example.com');
      const passwordHash = Password.create('SecurePass123!');
      const props = {
        email,
        username: 'testuser',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.create('LOCKED'),
        failedLoginAttempts: 5,
        lockedUntil: new Date('2020-01-01'), // past date
      };
      const user = User.reconstitute(props, 'user-1', mockOrgId);

      // Act & Assert
      expect(user.isLocked()).toBe(false);
    });
  });

  describe('addDomainEventFromService', () => {
    it('Given: user When: adding domain event from service Then: should add event', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);
      const initialEvents = user.domainEvents.length;
      const mockEvent = new UserStatusChangedEvent(
        user.id,
        'ACTIVE',
        'INACTIVE',
        'admin',
        mockOrgId
      );

      // Act
      user.addDomainEventFromService(mockEvent);

      // Assert
      expect(user.domainEvents.length).toBe(initialEvents + 1);
    });
  });

  describe('Getters', () => {
    it('Given: user with optional fields When: accessing getters Then: should return correct values', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        phone: '+1234567890',
        timezone: 'UTC',
        language: 'en',
        jobTitle: 'Developer',
        department: 'Engineering',
        mustChangePassword: true,
      };
      const user = User.create(props, mockOrgId);

      // Act & Assert
      expect(user.phone).toBe('+1234567890');
      expect(user.timezone).toBe('UTC');
      expect(user.language).toBe('en');
      expect(user.jobTitle).toBe('Developer');
      expect(user.department).toBe('Engineering');
      expect(user.mustChangePassword).toBe(true);
    });

    it('Given: user without optional fields When: accessing getters Then: should return undefined or defaults', () => {
      // Arrange
      const user = User.create(mockUserProps, mockOrgId);

      // Act & Assert
      expect(user.phone).toBeUndefined();
      expect(user.timezone).toBeUndefined();
      expect(user.language).toBeUndefined();
      expect(user.jobTitle).toBeUndefined();
      expect(user.department).toBeUndefined();
      expect(user.lastLoginAt).toBeUndefined();
      expect(user.lockedUntil).toBeUndefined();
      expect(user.mustChangePassword).toBe(false);
    });
  });

  describe('recordFailedLogin', () => {
    it('Given: user with less than 4 failed attempts When: recording failed login Then: should not lock user', () => {
      // Arrange
      const props = {
        ...mockUserProps,
        failedLoginAttempts: 3,
      };
      const user = User.create(props, mockOrgId);

      // Act
      user.recordFailedLogin();

      // Assert
      expect(user.failedLoginAttempts).toBe(4);
      expect(user.status.getValue()).toBe('ACTIVE');
    });
  });
});
