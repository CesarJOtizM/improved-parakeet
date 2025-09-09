import { User } from '@auth/domain/entities/user.entity';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { JwtToken } from '@auth/domain/valueObjects/jwtToken.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('AuthenticationService', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  const mockPassword = 'SecurePass123!';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  // Helper function to create a valid JWT token
  const createValidJwtToken = (type: 'ACCESS' | 'REFRESH'): JwtToken => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: mockUserId, iat: Date.now() })).toString(
      'base64'
    );
    const signature = Buffer.from('signature').toString('base64');
    const tokenValue = `${header}.${payload}.${signature}`;

    if (type === 'ACCESS') {
      return JwtToken.createAccessToken(tokenValue, 15);
    } else {
      return JwtToken.createRefreshToken(tokenValue, 7);
    }
  };

  describe('validateLoginCredentials', () => {
    it('Given: active user with correct password When: validating credentials Then: should return true', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword, // Pass as string, not Password object
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'), // Use create method
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const hashedPassword = await AuthenticationService.hashPassword(mockPassword);

      // Act
      const result = await AuthenticationService.validateLoginCredentials(
        user,
        mockPassword,
        hashedPassword
      );

      // Assert
      expect(result).toBe(true);
    });

    it('Given: inactive user with correct password When: validating credentials Then: should return false', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const hashedPassword = await AuthenticationService.hashPassword(mockPassword);

      // Act
      const result = await AuthenticationService.validateLoginCredentials(
        user,
        mockPassword,
        hashedPassword
      );

      // Assert
      expect(result).toBe(false);
    });

    it('Given: locked user with correct password When: validating credentials Then: should return false', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const hashedPassword = await AuthenticationService.hashPassword(mockPassword);

      // Act
      const result = await AuthenticationService.validateLoginCredentials(
        user,
        mockPassword,
        hashedPassword
      );

      // Assert
      expect(result).toBe(false);
    });

    it('Given: active user with incorrect password When: validating credentials Then: should return false', async () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const hashedPassword = await AuthenticationService.hashPassword(mockPassword);

      // Act
      const result = await AuthenticationService.validateLoginCredentials(
        user,
        'WrongPassword123!',
        hashedPassword
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('processSuccessfulLogin', () => {
    it('Given: user with failed attempts When: processing successful login Then: should reset failed attempts and add domain event', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Simulate failed attempts
      user.recordFailedLogin();
      user.recordFailedLogin();
      // const _initialFailedAttempts = user.failedLoginAttempts;

      // Act
      AuthenticationService.processSuccessfulLogin(user, mockIpAddress, mockUserAgent);

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('Given: user without ipAddress and userAgent When: processing successful login Then: should process login without optional data', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Act
      AuthenticationService.processSuccessfulLogin(user);

      // Assert
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('processFailedLogin', () => {
    it('Given: user with no failed attempts When: processing failed login Then: should increment failed attempts', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      const initialFailedAttempts = user.failedLoginAttempts;

      // Act
      AuthenticationService.processFailedLogin(user);

      // Assert
      expect(user.failedLoginAttempts).toBe(initialFailedAttempts + 1);
    });

    it('Given: user with multiple failed attempts When: processing failed login Then: should increment and potentially lock user', () => {
      // Arrange
      const user = User.create(
        {
          email: Email.create(mockEmail),
          password: mockPassword,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Simulate 4 failed attempts
      for (let i = 0; i < 4; i++) {
        user.recordFailedLogin();
      }

      // Act
      AuthenticationService.processFailedLogin(user);

      // Assert
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.isLocked()).toBe(true);
    });
  });

  describe('validateJwtToken', () => {
    it('Given: valid JWT token When: validating token Then: should return true', () => {
      // Arrange
      const token = createValidJwtToken('ACCESS');

      // Act
      const result = AuthenticationService.validateJwtToken(token);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: invalid JWT token When: validating token Then: should return false', () => {
      // Arrange
      // Create a token that will expire very soon and then wait for it to expire
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ sub: mockUserId, iat: Date.now() })).toString(
        'base64'
      );
      const signature = Buffer.from('signature').toString('base64');
      const tokenValue = `${header}.${payload}.${signature}`;

      // Create token with very short expiration (1 millisecond)
      const token = JwtToken.create(tokenValue, 'ACCESS', new Date(Date.now() + 1));

      // Act - Wait for token to expire
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const result = AuthenticationService.validateJwtToken(token);
          expect(result).toBe(false);
          resolve();
        }, 10); // Wait 10ms for token to expire
      });
    });
  });

  describe('createAuthTokens', () => {
    it('Given: userId with default expiry When: creating auth tokens Then: should return access and refresh tokens', () => {
      // Arrange
      const userId = mockUserId;

      // Act
      const result = AuthenticationService.createAuthTokens(userId);

      // Assert
      expect(result.accessToken).toBeInstanceOf(JwtToken);
      expect(result.refreshToken).toBeInstanceOf(JwtToken);
      expect(result.accessToken.isAccessToken()).toBe(true);
      expect(result.refreshToken.isRefreshToken()).toBe(true);
      expect(result.accessToken.getValue()).toMatch(
        /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/
      ); // JWT format (base64 with padding)
      expect(result.refreshToken.getValue()).toMatch(
        /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/
      ); // JWT format (base64 with padding)
      // Verify that userId is encoded in the JWT payload
      const accessTokenPayload = result.accessToken.getValue().split('.')[1];
      const refreshTokenPayload = result.refreshToken.getValue().split('.')[1];
      const decodedAccessPayload = JSON.parse(Buffer.from(accessTokenPayload, 'base64').toString());
      const decodedRefreshPayload = JSON.parse(
        Buffer.from(refreshTokenPayload, 'base64').toString()
      );
      expect(decodedAccessPayload.sub).toBe(userId);
      expect(decodedRefreshPayload.sub).toBe(userId);
    });

    it('Given: userId with custom expiry When: creating auth tokens Then: should return tokens with custom expiry', () => {
      // Arrange
      const userId = mockUserId;
      const customAccessExpiry = 30; // 30 minutes
      const customRefreshExpiry = 14; // 14 days

      // Act
      const result = AuthenticationService.createAuthTokens(
        userId,
        customAccessExpiry,
        customRefreshExpiry
      );

      // Assert
      expect(result.accessToken).toBeInstanceOf(JwtToken);
      expect(result.refreshToken).toBeInstanceOf(JwtToken);
      expect(result.accessToken.isAccessToken()).toBe(true);
      expect(result.refreshToken.isRefreshToken()).toBe(true);
      expect(result.accessToken.getValue()).toMatch(
        /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/
      ); // JWT format (base64 with padding)
      expect(result.refreshToken.getValue()).toMatch(
        /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/
      ); // JWT format (base64 with padding)
      // Verify that userId is encoded in the JWT payload
      const accessTokenPayload = result.accessToken.getValue().split('.')[1];
      const refreshTokenPayload = result.refreshToken.getValue().split('.')[1];
      const decodedAccessPayload = JSON.parse(Buffer.from(accessTokenPayload, 'base64').toString());
      const decodedRefreshPayload = JSON.parse(
        Buffer.from(refreshTokenPayload, 'base64').toString()
      );
      expect(decodedAccessPayload.sub).toBe(userId);
      expect(decodedRefreshPayload.sub).toBe(userId);
    });
  });

  describe('hashPassword', () => {
    it('Given: valid password When: hashing password Then: should return hashed password', async () => {
      // Arrange
      const password = mockPassword;

      // Act
      const hashedPassword = await AuthenticationService.hashPassword(password);

      // Assert
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash format
    });

    it('Given: same password When: hashing multiple times Then: should return different hashes', async () => {
      // Arrange
      const password = mockPassword;

      // Act
      const hash1 = await AuthenticationService.hashPassword(password);
      const hash2 = await AuthenticationService.hashPassword(password);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('Given: correct password and hash When: verifying password Then: should return true', async () => {
      // Arrange
      const password = mockPassword;
      const hashedPassword = await AuthenticationService.hashPassword(password);

      // Act
      const result = await AuthenticationService.verifyPassword(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: incorrect password and hash When: verifying password Then: should return false', async () => {
      // Arrange
      const password = mockPassword;
      const hashedPassword = await AuthenticationService.hashPassword(password);
      const wrongPassword = 'WrongPassword123!';

      // Act
      const result = await AuthenticationService.verifyPassword(wrongPassword, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('Given: strong password When: validating password strength Then: should return valid result', () => {
      // Arrange
      const password = 'StrongPass123!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: weak password without uppercase When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'weakpass123!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('Given: weak password without lowercase When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'WEAKPASS123!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('Given: weak password without numbers When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'WeakPass!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('Given: weak password without special characters When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'WeakPass123';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('Given: password too short When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'Weak1!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('Given: password too long When: validating password strength Then: should return invalid result', () => {
      // Arrange
      const password = 'A'.repeat(129) + 'b1!';

      // Act
      const result = AuthenticationService.validatePasswordStrength(password);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password too long');
    });
  });

  describe('hasPermission', () => {
    it('Given: user with required permission When: checking permission Then: should return true', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const requiredPermission = 'users:read';

      // Act
      const result = AuthenticationService.hasPermission(userPermissions, requiredPermission);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without required permission When: checking permission Then: should return false', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermission = 'products:delete';

      // Act
      const result = AuthenticationService.hasPermission(userPermissions, requiredPermission);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: empty user permissions When: checking permission Then: should return false', () => {
      // Arrange
      const userPermissions: string[] = [];
      const requiredPermission = 'users:read';

      // Act
      const result = AuthenticationService.hasPermission(userPermissions, requiredPermission);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('Given: user with one of required permissions When: checking any permission Then: should return true', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['users:read', 'products:delete'];

      // Act
      const result = AuthenticationService.hasAnyPermission(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with none of required permissions When: checking any permission Then: should return false', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['products:delete', 'reports:read'];

      // Act
      const result = AuthenticationService.hasAnyPermission(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: empty required permissions When: checking any permission Then: should return false', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions: string[] = [];

      // Act
      const result = AuthenticationService.hasAnyPermission(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('Given: user with all required permissions When: checking all permissions Then: should return true', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const requiredPermissions = ['users:read', 'users:write'];

      // Act
      const result = AuthenticationService.hasAllPermissions(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with some required permissions When: checking all permissions Then: should return false', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['users:read', 'users:write', 'products:delete'];

      // Act
      const result = AuthenticationService.hasAllPermissions(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: empty required permissions When: checking all permissions Then: should return true', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions: string[] = [];

      // Act
      const result = AuthenticationService.hasAllPermissions(userPermissions, requiredPermissions);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getSaltRounds', () => {
    it('Given: authentication service When: getting salt rounds Then: should return configured value', () => {
      // Act
      const result = AuthenticationService.getSaltRounds();

      // Assert
      expect(result).toBe(12);
    });
  });

  describe('getTokenConfig', () => {
    it('Given: authentication service When: getting token config Then: should return configured values', () => {
      // Act
      const result = AuthenticationService.getTokenConfig();

      // Assert
      expect(result.accessTokenExpiryMinutes).toBe(15);
      expect(result.refreshTokenExpiryDays).toBe(7);
    });
  });
});
