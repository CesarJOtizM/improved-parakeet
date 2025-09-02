import { User } from '@auth/domain/entities/user.entity';
import { UserCreatedEvent } from '@auth/domain/events/userCreated.event';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';

describe('UserCreatedEvent', () => {
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
      const event = new UserCreatedEvent(mockUser);

      // Assert
      expect(event).toBeInstanceOf(UserCreatedEvent);
      expect(event.eventName).toBe('UserCreated');
      expect(event.userId).toBe(mockUser.id);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.email).toBe('test@example.com');
      expect(event.username).toBe('testuser');
      expect(event.name).toBe('Test User');
      expect(event.firstName).toBe('Test');
      expect(event.lastName).toBe('User');
    });

    it('Given: user with different properties When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const differentUser = User.create(
        {
          email: Email.create('admin@company.com'),
          password: 'SecurePass456!',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'different-org-id'
      );

      // Act
      const event = new UserCreatedEvent(differentUser);

      // Assert
      expect(event.userId).toBe(differentUser.id);
      expect(event.orgId).toBe('different-org-id');
      expect(event.email).toBe('admin@company.com');
      expect(event.username).toBe('admin');
      expect(event.name).toBe('Admin User');
      expect(event.firstName).toBe('Admin');
      expect(event.lastName).toBe('User');
    });
  });

  describe('eventName', () => {
    it('Given: user created event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('UserCreated');
    });
  });

  describe('occurredOn', () => {
    it('Given: user created event When: getting occurred on date Then: should return user created at', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(mockUser.createdAt);
    });
  });

  describe('userId', () => {
    it('Given: user created event When: getting user id Then: should return user id', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const userId = event.userId;

      // Assert
      expect(userId).toBe(mockUser.id);
    });
  });

  describe('orgId', () => {
    it('Given: user created event When: getting org id Then: should return user org id', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('email', () => {
    it('Given: user created event When: getting email Then: should return user email', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const email = event.email;

      // Assert
      expect(email).toBe('test@example.com');
    });
  });

  describe('username', () => {
    it('Given: user created event When: getting username Then: should return user username', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const username = event.username;

      // Assert
      expect(username).toBe('testuser');
    });
  });

  describe('name', () => {
    it('Given: user created event When: getting name Then: should return user full name', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

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
      const event = new UserCreatedEvent(differentUser);

      // Act
      const name = event.name;

      // Assert
      expect(name).toBe('John Doe');
    });
  });

  describe('firstName', () => {
    it('Given: user created event When: getting first name Then: should return user first name', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const firstName = event.firstName;

      // Assert
      expect(firstName).toBe('Test');
    });
  });

  describe('lastName', () => {
    it('Given: user created event When: getting last name Then: should return user last name', () => {
      // Arrange
      const event = new UserCreatedEvent(mockUser);

      // Act
      const lastName = event.lastName;

      // Assert
      expect(lastName).toBe('User');
    });
  });
});
