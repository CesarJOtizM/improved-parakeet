import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { Session } from '@auth/domain/entities/session.entity';
import { User } from '@auth/domain/entities/user.entity';
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RateLimitError, TokenError } from '@shared/domain/result/domainError';

import type { ISessionRepository, IUserRepository } from '@auth/domain/repositories';

describe('RefreshTokenUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'c84927b9-d633-4e4c-aeae-fd414b2effa4';
  const mockRefreshToken = 'refresh-token';
  const mockJti = 'jti-123';

  let useCase: RefreshTokenUseCase;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockTokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJwtService = {
      verifyToken: jest.fn(),
      generateTokenPair: jest.fn(),
      decodeToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      extractTokenFromHeader: jest.fn(),
      isTokenNearExpiration: jest.fn(),
      generateTokenId: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockTokenBlacklistService = {
      blacklistToken: jest.fn(),
      blacklistAllUserTokens: jest.fn(),
      isTokenBlacklisted: jest.fn(),
      getBlacklistedToken: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
      getBlacklistStats: jest.fn(),
    } as unknown as jest.Mocked<TokenBlacklistService>;

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
      checkRefreshTokenRateLimit: jest.fn(),
      checkPasswordResetRateLimit: jest.fn(),
      checkLoginRateLimit: jest.fn(),
    } as unknown as jest.Mocked<RateLimitService>;

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findLockedUsers: jest.fn(),
      countByStatus: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockSessionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
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
    } as jest.Mocked<ISessionRepository>;

    useCase = new RefreshTokenUseCase(
      mockJwtService,
      mockTokenBlacklistService,
      mockRateLimitService,
      mockUserRepository,
      mockSessionRepository
    );
  });

  describe('execute', () => {
    const createMockUser = (): User => {
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
      // Mock canLogin method
      Object.defineProperty(user, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      // Add roles and permissions using props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any).props.roles = ['ADMIN'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any).props.permissions = ['USERS:READ'];
      return user;
    };

    const createMockSession = (): Session => {
      const session = Session.reconstitute(
        {
          userId: mockUserId,
          token: mockRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          isActive: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        'session-123',
        mockOrgId
      );
      return session;
    };

    const validRequest = {
      refreshToken: mockRefreshToken,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('Given: valid refresh token When: refreshing token Then: should return new tokens', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const mockSession = createMockSession();
      mockSessionRepository.findActiveByUserIdAndToken.mockResolvedValue(mockSession);
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 900000),
        refreshTokenExpiresAt: new Date(Date.now() + 86400000),
      });
      mockJwtService.decodeToken.mockReturnValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: 'new-jti',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.blacklistToken.mockResolvedValue(undefined);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.accessToken).toBe('new-access-token');
          expect(value.data.refreshToken).toBe('new-refresh-token');
          expect(value.data.user.id).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTokenBlacklistService.blacklistToken).toHaveBeenCalled();
      expect(mockSessionRepository.save).toHaveBeenCalled();
    });

    it('Given: rate limit exceeded When: refreshing token Then: should return RateLimitError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        blocked: true,
        blockExpiresAt: new Date(Date.now() + 600000),
      });

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(RateLimitError);
        }
      );
    });

    it('Given: invalid refresh token When: refreshing token Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });

    it('Given: blacklisted refresh token When: refreshing token Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });

    it('Given: user not found When: refreshing token Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });

    it('Given: locked user When: refreshing token Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const mockUser = createMockUser();
      Object.defineProperty(mockUser, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(false),
        writable: true,
        configurable: true,
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });

    it('Given: no active session When: refreshing token Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRefreshTokenRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: mockUserId,
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockSessionRepository.findActiveByUserIdAndToken.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });
  });
});
