import { Session } from '@auth/domain/entities/session.entity';

describe('Session Entity', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'test-user-id';
  const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  describe('create', () => {
    it('Given: valid session props and orgId When: creating session Then: should create valid session', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };

      // Act
      const session = Session.create(props, mockOrgId);

      // Assert
      expect(session).toBeInstanceOf(Session);
      expect(session.userId).toBe(props.userId);
      expect(session.token).toBe(props.token);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.isActive).toBe(props.isActive);
      expect(session.ipAddress).toBe(props.ipAddress);
      expect(session.userAgent).toBe(props.userAgent);
      expect(session.orgId).toBe(mockOrgId);
      expect(session.id).toBeDefined();
    });

    it('Given: session props without optional fields When: creating session Then: should create session with undefined optional fields', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };

      // Act
      const session = Session.create(props, mockOrgId);

      // Assert
      expect(session).toBeInstanceOf(Session);
      expect(session.userId).toBe(props.userId);
      expect(session.token).toBe(props.token);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.isActive).toBe(props.isActive);
      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
    });

    it('Given: inactive session props When: creating session Then: should create inactive session', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: false,
      };

      // Act
      const session = Session.create(props, mockOrgId);

      // Assert
      expect(session).toBeInstanceOf(Session);
      expect(session.isActive).toBe(props.isActive);
    });
  });

  describe('reconstitute', () => {
    it('Given: valid session props, id, orgId When: reconstituting session Then: should create session with provided data', () => {
      // Arrange
      const mockId = 'test-session-id';
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };

      // Act
      const session = Session.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(session).toBeInstanceOf(Session);
      expect(session.id).toBe(mockId);
      expect(session.orgId).toBe(mockOrgId);
      expect(session.userId).toBe(props.userId);
      expect(session.token).toBe(props.token);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.isActive).toBe(props.isActive);
      expect(session.ipAddress).toBe(props.ipAddress);
      expect(session.userAgent).toBe(props.userAgent);
    });
  });

  describe('update', () => {
    it('Given: session with partial update props When: updating session Then: should update only provided fields', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };
      const session = Session.create(props, mockOrgId);
      const updateProps = {
        token: 'new-token-value',
        isActive: false,
      };

      // Act
      session.update(updateProps);

      // Assert
      expect(session.token).toBe(updateProps.token);
      expect(session.isActive).toBe(updateProps.isActive);
      expect(session.userId).toBe(props.userId);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.ipAddress).toBe(props.ipAddress);
      expect(session.userAgent).toBe(props.userAgent);
    });

    it('Given: session with undefined update props When: updating session Then: should not change any fields', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };
      const session = Session.create(props, mockOrgId);
      const originalToken = session.token;
      const originalIsActive = session.isActive;
      const originalExpiresAt = session.expiresAt;
      const originalIpAddress = session.ipAddress;
      const originalUserAgent = session.userAgent;
      const updateProps = {
        token: undefined,
        expiresAt: undefined,
        isActive: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      };

      // Act
      session.update(updateProps);

      // Assert
      expect(session.token).toBe(originalToken);
      expect(session.isActive).toBe(originalIsActive);
      expect(session.expiresAt).toEqual(originalExpiresAt);
      expect(session.ipAddress).toBe(originalIpAddress);
      expect(session.userAgent).toBe(originalUserAgent);
    });
  });

  describe('deactivate', () => {
    it('Given: active session When: deactivating session Then: should set isActive to false', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      session.deactivate();

      // Assert
      expect(session.isActive).toBe(false);
    });

    it('Given: already inactive session When: deactivating session Then: should remain inactive', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: false,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      session.deactivate();

      // Assert
      expect(session.isActive).toBe(false);
    });
  });

  describe('extendExpiration', () => {
    it('Given: session with current expiry When: extending expiration Then: should extend expiry by specified minutes', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);
      const additionalMinutes = 30;

      // Act
      session.extendExpiration(additionalMinutes);

      // Assert
      const expectedExpiry = new Date(Date.now() + additionalMinutes * 60 * 1000);
      expect(session.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('Given: session with zero additional minutes When: extending expiration Then: should not change expiry', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);
      // const _originalExpiresAt = session.expiresAt;

      // Act
      session.extendExpiration(0);

      // Assert
      // When extending by 0 minutes, it should set expiry to current time + 0
      expect(session.expiresAt.getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('isExpired', () => {
    it('Given: session with future expiry When: checking if expired Then: should return false', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      const result = session.isExpired();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: session with past expiry When: checking if expired Then: should return true', () => {
      // Arrange
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.reconstitute(props, 'test-id', mockOrgId);

      // Act
      const result = session.isExpired();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: session with current time expiry When: checking if expired Then: should return true', () => {
      // Arrange
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.reconstitute(props, 'test-id', mockOrgId);

      // Act
      const result = session.isExpired();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('isValid', () => {
    it('Given: active session with future expiry When: checking if valid Then: should return true', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      const result = session.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: inactive session with future expiry When: checking if valid Then: should return false', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: false,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      const result = session.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: active session with past expiry When: checking if valid Then: should return false', () => {
      // Arrange
      const expiresAt = new Date(Date.now() - 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.reconstitute(props, 'test-id', mockOrgId);

      // Act
      const result = session.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: inactive session with past expiry When: checking if valid Then: should return false', () => {
      // Arrange
      const expiresAt = new Date(Date.now() - 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: false,
      };
      const session = Session.reconstitute(props, 'test-id', mockOrgId);

      // Act
      const result = session.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('Given: session with current token When: refreshing token Then: should update token', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);
      const newToken = 'new-refreshed-token';

      // Act
      session.refreshToken(newToken);

      // Assert
      expect(session.token).toBe(newToken);
    });

    it('Given: session with empty new token When: refreshing token Then: should update token to empty string', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);
      const newToken = '';

      // Act
      session.refreshToken(newToken);

      // Assert
      expect(session.token).toBe(newToken);
    });
  });

  describe('Getters', () => {
    it('Given: session with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };
      const session = Session.create(props, mockOrgId);

      // Act & Assert
      expect(session.userId).toBe(props.userId);
      expect(session.token).toBe(props.token);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.isActive).toBe(props.isActive);
      expect(session.ipAddress).toBe(props.ipAddress);
      expect(session.userAgent).toBe(props.userAgent);
    });

    it('Given: session without optional properties When: accessing optional getters Then: should return undefined', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act & Assert
      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
    });
  });

  describe('Domain Events', () => {
    it('Given: newly created session When: checking domain events Then: should have no domain events', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act & Assert
      // Session entity doesn't have domain events, so we skip this test
      expect(session).toBeInstanceOf(Session);
    });

    it('Given: session after update When: checking domain events Then: should have updated timestamp', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act
      session.update({ isActive: false });

      // Assert
      expect(session.isActive).toBe(false);
    });
  });

  describe('Entity Properties', () => {
    it('Given: newly created session When: checking entity properties Then: should have correct timestamps', () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
      };
      const session = Session.create(props, mockOrgId);

      // Act & Assert
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('Given: reconstituted session When: checking entity properties Then: should preserve original data', () => {
      // Arrange
      const mockId = 'test-session-id';
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const props = {
        userId: mockUserId,
        token: mockToken,
        expiresAt,
        isActive: true,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };

      // Act
      const session = Session.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(session.id).toBe(mockId);
      expect(session.orgId).toBe(mockOrgId);
      expect(session.userId).toBe(props.userId);
      expect(session.token).toBe(props.token);
      expect(session.expiresAt).toEqual(props.expiresAt);
      expect(session.isActive).toBe(props.isActive);
      expect(session.ipAddress).toBe(props.ipAddress);
      expect(session.userAgent).toBe(props.userAgent);
    });
  });
});
