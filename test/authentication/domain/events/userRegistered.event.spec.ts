import { User } from '@auth/domain/entities/user.entity';
import { UserRegisteredEvent } from '@auth/domain/events/userRegistered.event';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';

describe('UserRegisteredEvent', () => {
  const mockOrgId = 'test-org-id';
  const mockUser = User.create(
    {
      email: Email.create('test@example.com'),
      password: 'SecurePass123!',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      status: UserStatus.create('ACTIVE'),
      failedLoginAttempts: 0,
    },
    mockOrgId
  );

  describe('constructor', () => {
    it('Given: valid user When: creating event Then: should create event with correct properties', () => {
      // Act
      const event = new UserRegisteredEvent(mockUser);

      // Assert
      expect(event).toBeInstanceOf(UserRegisteredEvent);
      expect(event.eventName).toBe('UserRegistered');
      expect(event.userId).toBe(mockUser.id);
      expect(event.userOrgId).toBe(mockOrgId);
      expect(event.email).toBe('test@example.com');
      expect(event.username).toBe('testuser');
      expect(event.name).toBe('Test User');
      expect(event.firstName).toBe('Test');
      expect(event.lastName).toBe('User');
      expect(event.organizationSlug).toBeUndefined();
      expect(event.organizationId).toBeUndefined();
      expect(event.userStatus).toBe('ACTIVE');
    });

    it('Given: user with organization data When: creating event Then: should create event with organization info', () => {
      // Arrange
      const orgSlug = 'test-company';
      const orgId = 'org-123';

      // Act
      const event = new UserRegisteredEvent(mockUser, orgSlug, orgId);

      // Assert
      expect(event.organizationSlug).toBe(orgSlug);
      expect(event.organizationId).toBe(orgId);
    });

    it('Given: user with different status When: creating event Then: should create event with correct status', () => {
      // Arrange
      const inactiveUser = User.create(
        {
          email: Email.create('inactive@example.com'),
          password: 'SecurePass123!',
          username: 'inactiveuser',
          firstName: 'Inactive',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      const event = new UserRegisteredEvent(inactiveUser);

      // Assert
      expect(event.userStatus).toBe('INACTIVE');
    });
  });

  describe('eventName', () => {
    it('Given: user registered event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('UserRegistered');
    });
  });

  describe('occurredOn', () => {
    it('Given: user registered event When: getting occurred on date Then: should return user created at', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(mockUser.createdAt);
    });
  });

  describe('userId', () => {
    it('Given: user registered event When: getting user id Then: should return user id', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const userId = event.userId;

      // Assert
      expect(userId).toBe(mockUser.id);
    });
  });

  describe('userOrgId', () => {
    it('Given: user registered event When: getting user org id Then: should return user org id', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const userOrgId = event.userOrgId;

      // Assert
      expect(userOrgId).toBe(mockOrgId);
    });
  });

  describe('email', () => {
    it('Given: user registered event When: getting email Then: should return user email', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const email = event.email;

      // Assert
      expect(email).toBe('test@example.com');
    });
  });

  describe('username', () => {
    it('Given: user registered event When: getting username Then: should return user username', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const username = event.username;

      // Assert
      expect(username).toBe('testuser');
    });
  });

  describe('name', () => {
    it('Given: user registered event When: getting name Then: should return user full name', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const name = event.name;

      // Assert
      expect(name).toBe('Test User');
    });

    it('Given: user with different names When: getting name Then: should return correct full name', () => {
      // Arrange
      const differentUser = User.create(
        {
          email: Email.create('john.doe@example.com'),
          password: 'SecurePass123!',
          username: 'johndoe',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const event = new UserRegisteredEvent(differentUser);

      // Act
      const name = event.name;

      // Assert
      expect(name).toBe('John Doe');
    });
  });

  describe('firstName', () => {
    it('Given: user registered event When: getting first name Then: should return user first name', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const firstName = event.firstName;

      // Assert
      expect(firstName).toBe('Test');
    });
  });

  describe('lastName', () => {
    it('Given: user registered event When: getting last name Then: should return user last name', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const lastName = event.lastName;

      // Assert
      expect(lastName).toBe('User');
    });
  });

  describe('organizationSlug', () => {
    it('Given: user registered event with org slug When: getting organization slug Then: should return org slug', () => {
      // Arrange
      const orgSlug = 'test-company';
      const event = new UserRegisteredEvent(mockUser, orgSlug);

      // Act
      const organizationSlug = event.organizationSlug;

      // Assert
      expect(organizationSlug).toBe(orgSlug);
    });

    it('Given: user registered event without org slug When: getting organization slug Then: should return undefined', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const organizationSlug = event.organizationSlug;

      // Assert
      expect(organizationSlug).toBeUndefined();
    });
  });

  describe('organizationId', () => {
    it('Given: user registered event with org id When: getting organization id Then: should return org id', () => {
      // Arrange
      const orgSlug = 'test-company';
      const orgId = 'org-123';
      const event = new UserRegisteredEvent(mockUser, orgSlug, orgId);

      // Act
      const organizationId = event.organizationId;

      // Assert
      expect(organizationId).toBe(orgId);
    });

    it('Given: user registered event without org id When: getting organization id Then: should return undefined', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const organizationId = event.organizationId;

      // Assert
      expect(organizationId).toBeUndefined();
    });
  });

  describe('userStatus', () => {
    it('Given: user registered event When: getting user status Then: should return user status', () => {
      // Arrange
      const event = new UserRegisteredEvent(mockUser);

      // Act
      const userStatus = event.userStatus;

      // Assert
      expect(userStatus).toBe('ACTIVE');
    });

    it('Given: user with different status When: getting user status Then: should return correct status', () => {
      // Arrange
      const lockedUser = User.create(
        {
          email: Email.create('locked@example.com'),
          password: 'SecurePass123!',
          username: 'lockeduser',
          firstName: 'Locked',
          lastName: 'User',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const event = new UserRegisteredEvent(lockedUser);

      // Act
      const userStatus = event.userStatus;

      // Assert
      expect(userStatus).toBe('LOCKED');
    });
  });
});
