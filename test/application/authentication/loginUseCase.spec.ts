/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { Session } from '@auth/domain/entities/session.entity';
import { User } from '@auth/domain/entities/user.entity';
import { ISessionRepository } from '@auth/domain/repositories/sessionRepository.interface';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';

// Mock dependencies
jest.mock('@auth/domain/services/authenticationService');
jest.mock('@auth/domain/services/jwtService');
jest.mock('@auth/domain/services/tokenBlacklistService');
jest.mock('@auth/domain/services/rateLimitService');

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockTokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockUserRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findLockedUsers: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      countByStatus: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockJwtService = {
      generateTokenPair: jest.fn(),
      decodeToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      verifyToken: jest.fn(),
      extractTokenFromHeader: jest.fn(),
      isTokenNearExpiration: jest.fn(),
      generateTokenId: jest.fn(),
      nestJwtService: {} as jest.Mocked<JwtService>,
    } as any;

    mockTokenBlacklistService = {
      isTokenBlacklisted: jest.fn(),
      blacklistToken: jest.fn(),
      getBlacklistedToken: jest.fn(),
      blacklistAllUserTokens: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
      getBlacklistStats: jest.fn(),
      addToUserTokensList: jest.fn(),
      getUserTokensList: jest.fn(),
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
      BLACKLIST_PREFIX: 'blacklist:',
      USER_TOKENS_PREFIX: 'user_tokens:',
      cacheManager: {} as jest.Mocked<Cache>,
    } as any;
    mockRateLimitService = {
      checkRateLimit: jest.fn(),
      checkLoginRateLimit: jest.fn(),
      checkRefreshTokenRateLimit: jest.fn(),
      checkPasswordResetRateLimit: jest.fn(),
      resetRateLimit: jest.fn(),
      getRateLimitStats: jest.fn(),
      getRateLimitEntry: jest.fn(),
      saveRateLimitEntry: jest.fn(),
      isBlocked: jest.fn(),
      blockIdentifier: jest.fn(),
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
      RATE_LIMIT_PREFIX: 'rate_limit:',
      BLOCK_PREFIX: 'block:',
      DEFAULT_CONFIGS: {},
      cacheManager: {} as jest.Mocked<Cache>,
    } as any;

    mockSessionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByToken: jest.fn(),
      findByUserId: jest.fn(),
      findActiveSessions: jest.fn(),
      findActiveByUserIdAndToken: jest.fn(),
      findExpiredSessions: jest.fn(),
      findSessionsByIpAddress: jest.fn(),
      findSessionsByUserAgent: jest.fn(),
      findSessionsByDateRange: jest.fn(),
      countActiveSessions: jest.fn(),
      deleteExpiredSessions: jest.fn(),
      deleteSessionsByUserId: jest.fn(),
      deleteSessionsByToken: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ISessionRepository>;

    // Create LoginUseCase instance
    loginUseCase = new LoginUseCase(
      mockUserRepository,
      mockSessionRepository,
      mockJwtService,
      mockTokenBlacklistService,
      mockRateLimitService
    );
  });

  describe('execute', () => {
    it('Given: valid credentials and active user When: executing login Then: should return successful login result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const mockTokenPair = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockSession = Session.create(
        {
          userId: mockUserId,
          token: 'access-token',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          isActive: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        mockOrgId
      );

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });
      mockJwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      mockJwtService.decodeToken.mockReturnValue({
        jti: 'jti-123',
        exp: Date.now() + 15 * 60 * 1000,
        iat: Math.floor(Date.now() / 1000),
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
      });
      mockSessionRepository.save.mockResolvedValue(mockSession);

      // Mock AuthenticationService methods
      jest.spyOn(AuthenticationService, 'validateLoginCredentials').mockResolvedValue(true);

      // Act
      const result = await loginUseCase.execute(loginDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('accessToken');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('user');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrgId);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.orgId,
        mockUser.email,
        mockUser.username,
        mockUser.roles || [],
        mockUser.permissions || []
      );
      expect(mockSessionRepository.save).toHaveBeenCalled();
    });

    it('Given: invalid email When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com',
        mockOrgId
      );
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
    });

    it('Given: incorrect password When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });

      // Mock AuthenticationService methods
      jest.spyOn(AuthenticationService, 'validateLoginCredentials').mockResolvedValue(false);
      jest.spyOn(AuthenticationService, 'processFailedLogin').mockImplementation(() => {});

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrgId);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
      expect(AuthenticationService.validateLoginCredentials).toHaveBeenCalledWith(
        mockUser,
        'WrongPassword123!',
        mockUser.passwordHash
      );
      expect(AuthenticationService.processFailedLogin).toHaveBeenCalledWith(mockUser);
    });

    it('Given: inactive user When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Account is locked or inactive');

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrgId);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
    });

    it('Given: locked user When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('LOCKED'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Account is locked or inactive');

      // Verify repository calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrgId);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
    });

    it('Given: rate limit exceeded When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      // Mock repository responses
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: true,
        blockExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow(
        'Too many login attempts. Please try again later.'
      );

      // Verify rate limit check
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'LOGIN');
    });

    it('Given: JWT service error When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });
      mockJwtService.generateTokenPair.mockRejectedValue(new Error('JWT generation failed'));

      // Mock AuthenticationService methods
      jest.spyOn(AuthenticationService, 'validateLoginCredentials').mockResolvedValue(true);
      jest.spyOn(AuthenticationService, 'processSuccessfulLogin').mockImplementation(() => {});

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Authentication failed');

      // Verify service calls
      expect(AuthenticationService.validateLoginCredentials).toHaveBeenCalledWith(
        mockUser,
        'ValidPass123!',
        mockUser.passwordHash
      );
      expect(AuthenticationService.processSuccessfulLogin).toHaveBeenCalledWith(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });

    it('Given: session creation error When: executing login Then: should return error result', async () => {
      // Arrange
      const loginDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: mockOrgId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockUser = User.create(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );

      const mockTokenPair = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Mock repository responses
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false,
      });
      mockJwtService.generateTokenPair.mockResolvedValue(mockTokenPair);
      mockJwtService.decodeToken.mockReturnValue({
        jti: 'jti-123',
        exp: Date.now() + 15 * 60 * 1000,
        iat: Math.floor(Date.now() / 1000),
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
      });
      mockSessionRepository.save.mockRejectedValue(new Error('Session creation failed'));

      // Mock AuthenticationService methods
      jest.spyOn(AuthenticationService, 'validateLoginCredentials').mockResolvedValue(true);
      jest.spyOn(AuthenticationService, 'processSuccessfulLogin').mockImplementation(() => {});

      // Act & Assert
      await expect(loginUseCase.execute(loginDto)).rejects.toThrow('Authentication failed');

      // Verify service calls
      expect(AuthenticationService.validateLoginCredentials).toHaveBeenCalledWith(
        mockUser,
        'ValidPass123!',
        mockUser.passwordHash
      );
      expect(AuthenticationService.processSuccessfulLogin).toHaveBeenCalledWith(
        mockUser,
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });
  });
});
