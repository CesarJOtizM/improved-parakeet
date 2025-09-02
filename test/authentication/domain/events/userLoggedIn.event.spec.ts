import { User } from '@auth/domain/entities/user.entity';
import { UserLoggedInEvent } from '@auth/domain/events/userLoggedIn.event';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';

describe('UserLoggedInEvent', () => {
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
    it('Given: valid user and login data When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const loginTimestamp = new Date();
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      // Act
      const event = new UserLoggedInEvent(mockUser, loginTimestamp, ipAddress, userAgent);

      // Assert
      expect(event).toBeInstanceOf(UserLoggedInEvent);
      expect(event.eventName).toBe('UserLoggedIn');
      expect(event.userId).toBe(mockUser.id);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.email).toBe('test@example.com');
      expect(event.username).toBe('testuser');
      expect(event.loginTimestamp).toBe(loginTimestamp);
      expect(event.ipAddress).toBe(ipAddress);
      expect(event.userAgent).toBe(userAgent);
    });

    it('Given: user without ip address and user agent When: creating event Then: should create event with undefined values', () => {
      // Arrange
      const loginTimestamp = new Date();

      // Act
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Assert
      expect(event.ipAddress).toBeUndefined();
      expect(event.userAgent).toBeUndefined();
    });

    it('Given: user with only ip address When: creating event Then: should create event with ip address only', () => {
      // Arrange
      const loginTimestamp = new Date();
      const ipAddress = '10.0.0.1';

      // Act
      const event = new UserLoggedInEvent(mockUser, loginTimestamp, ipAddress);

      // Assert
      expect(event.ipAddress).toBe(ipAddress);
      expect(event.userAgent).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: user logged in event When: getting event name Then: should return correct name', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('UserLoggedIn');
    });
  });

  describe('occurredOn', () => {
    it('Given: user logged in event When: getting occurred on date Then: should return login timestamp', () => {
      // Arrange
      const loginTimestamp = new Date('2024-01-15T10:30:00Z');
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(loginTimestamp);
    });
  });

  describe('userId', () => {
    it('Given: user logged in event When: getting user id Then: should return user id', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const userId = event.userId;

      // Assert
      expect(userId).toBe(mockUser.id);
    });
  });

  describe('orgId', () => {
    it('Given: user logged in event When: getting org id Then: should return user org id', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('email', () => {
    it('Given: user logged in event When: getting email Then: should return user email', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const email = event.email;

      // Assert
      expect(email).toBe('test@example.com');
    });
  });

  describe('username', () => {
    it('Given: user logged in event When: getting username Then: should return user username', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const username = event.username;

      // Assert
      expect(username).toBe('testuser');
    });
  });

  describe('loginTimestamp', () => {
    it('Given: user logged in event When: getting login timestamp Then: should return provided timestamp', () => {
      // Arrange
      const loginTimestamp = new Date('2024-01-15T10:30:00Z');
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const result = event.loginTimestamp;

      // Assert
      expect(result).toBe(loginTimestamp);
    });
  });

  describe('ipAddress', () => {
    it('Given: user logged in event with ip address When: getting ip address Then: should return ip address', () => {
      // Arrange
      const loginTimestamp = new Date();
      const ipAddress = '192.168.1.100';
      const event = new UserLoggedInEvent(mockUser, loginTimestamp, ipAddress);

      // Act
      const result = event.ipAddress;

      // Assert
      expect(result).toBe(ipAddress);
    });

    it('Given: user logged in event without ip address When: getting ip address Then: should return undefined', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const result = event.ipAddress;

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('userAgent', () => {
    it('Given: user logged in event with user agent When: getting user agent Then: should return user agent', () => {
      // Arrange
      const loginTimestamp = new Date();
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      const event = new UserLoggedInEvent(mockUser, loginTimestamp, ipAddress, userAgent);

      // Act
      const result = event.userAgent;

      // Assert
      expect(result).toBe(userAgent);
    });

    it('Given: user logged in event without user agent When: getting user agent Then: should return undefined', () => {
      // Arrange
      const loginTimestamp = new Date();
      const event = new UserLoggedInEvent(mockUser, loginTimestamp);

      // Act
      const result = event.userAgent;

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
