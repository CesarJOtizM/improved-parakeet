import { Session } from '@auth/domain/entities/session.entity';
import { SessionExpiredEvent } from '@auth/domain/events/sessionExpired.event';

describe('SessionExpiredEvent', () => {
  const mockOrgId = 'test-org-id';
  const mockSession = Session.create(
    {
      userId: 'user-123',
      token: 'jwt.token.here',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      isActive: true,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    mockOrgId
  );

  describe('constructor', () => {
    it('Given: valid session When: creating event Then: should create event with correct properties', () => {
      // Act
      const event = new SessionExpiredEvent(mockSession);

      // Assert
      expect(event).toBeInstanceOf(SessionExpiredEvent);
      expect(event.eventName).toBe('SessionExpired');
      expect(event.sessionId).toBe(mockSession.id);
      expect(event.userId).toBe('user-123');
      expect(event.orgId).toBe(mockOrgId);
      expect(event.token).toBe('jwt.token.here');
      expect(event.expiresAt).toBe(mockSession.expiresAt);
      expect(event.ipAddress).toBe('192.168.1.1');
      expect(event.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    });

    it('Given: session without ip address When: creating event Then: should create event with undefined ip address', () => {
      // Arrange
      const sessionWithoutIp = Session.create(
        {
          userId: 'user-456',
          token: 'another.jwt.token',
          expiresAt: new Date(Date.now() + 1800000), // 30 minutes from now
          isActive: true,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        mockOrgId
      );

      // Act
      const event = new SessionExpiredEvent(sessionWithoutIp);

      // Assert
      expect(event.ipAddress).toBeUndefined();
    });

    it('Given: session without user agent When: creating event Then: should create event with undefined user agent', () => {
      // Arrange
      const sessionWithoutUserAgent = Session.create(
        {
          userId: 'user-789',
          token: 'third.jwt.token',
          expiresAt: new Date(Date.now() + 900000), // 15 minutes from now
          isActive: true,
          ipAddress: '10.0.0.1',
        },
        mockOrgId
      );

      // Act
      const event = new SessionExpiredEvent(sessionWithoutUserAgent);

      // Assert
      expect(event.userAgent).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: session expired event When: getting event name Then: should return correct name', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('SessionExpired');
    });
  });

  describe('occurredOn', () => {
    it('Given: session expired event When: getting occurred on date Then: should return current date', () => {
      // Arrange
      const beforeEvent = new Date();
      const event = new SessionExpiredEvent(mockSession);
      const afterEvent = new Date();

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeEvent.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterEvent.getTime());
    });
  });

  describe('sessionId', () => {
    it('Given: session expired event When: getting session id Then: should return session id', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const sessionId = event.sessionId;

      // Assert
      expect(sessionId).toBe(mockSession.id);
    });
  });

  describe('userId', () => {
    it('Given: session expired event When: getting user id Then: should return user id', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const userId = event.userId;

      // Assert
      expect(userId).toBe('user-123');
    });
  });

  describe('orgId', () => {
    it('Given: session expired event When: getting org id Then: should return session org id', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('token', () => {
    it('Given: session expired event When: getting token Then: should return session token', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const token = event.token;

      // Assert
      expect(token).toBe('jwt.token.here');
    });
  });

  describe('expiresAt', () => {
    it('Given: session expired event When: getting expires at Then: should return session expires at', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const expiresAt = event.expiresAt;

      // Assert
      expect(expiresAt).toBe(mockSession.expiresAt);
    });
  });

  describe('ipAddress', () => {
    it('Given: session expired event with ip address When: getting ip address Then: should return session ip address', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const ipAddress = event.ipAddress;

      // Assert
      expect(ipAddress).toBe('192.168.1.1');
    });

    it('Given: session expired event without ip address When: getting ip address Then: should return undefined', () => {
      // Arrange
      const sessionWithoutIp = Session.create(
        {
          userId: 'user-456',
          token: 'another.jwt.token',
          expiresAt: new Date(Date.now() + 1800000),
          isActive: true,
        },
        mockOrgId
      );
      const event = new SessionExpiredEvent(sessionWithoutIp);

      // Act
      const ipAddress = event.ipAddress;

      // Assert
      expect(ipAddress).toBeUndefined();
    });
  });

  describe('userAgent', () => {
    it('Given: session expired event with user agent When: getting user agent Then: should return session user agent', () => {
      // Arrange
      const event = new SessionExpiredEvent(mockSession);

      // Act
      const userAgent = event.userAgent;

      // Assert
      expect(userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    });

    it('Given: session expired event without user agent When: getting user agent Then: should return undefined', () => {
      // Arrange
      const sessionWithoutUserAgent = Session.create(
        {
          userId: 'user-789',
          token: 'third.jwt.token',
          expiresAt: new Date(Date.now() + 900000),
          isActive: true,
        },
        mockOrgId
      );
      const event = new SessionExpiredEvent(sessionWithoutUserAgent);

      // Act
      const userAgent = event.userAgent;

      // Assert
      expect(userAgent).toBeUndefined();
    });
  });
});
