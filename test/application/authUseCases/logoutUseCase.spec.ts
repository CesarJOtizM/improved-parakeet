import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RateLimitError, TokenError } from '@shared/domain/result/domainError';

import type { ISessionRepository } from '@auth/domain/repositories';

describe('LogoutUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';
  const mockAccessToken = 'access-token';
  const mockRefreshToken = 'refresh-token';
  const mockJti = 'jti-123';

  let useCase: LogoutUseCase;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockTokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;

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

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
      checkRefreshTokenRateLimit: jest.fn(),
      checkPasswordResetRateLimit: jest.fn(),
      checkLoginRateLimit: jest.fn(),
    } as unknown as jest.Mocked<RateLimitService>;

    useCase = new LogoutUseCase(
      mockJwtService,
      mockTokenBlacklistService,
      mockSessionRepository,
      mockRateLimitService
    );
  });

  describe('execute', () => {
    const validRequest = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      userId: mockUserId,
      orgId: mockOrgId,
      ipAddress: '192.168.1.1',
      reason: 'LOGOUT' as const,
    };

    it('Given: valid tokens When: logging out Then: should return success result', async () => {
      // Arrange
      mockRateLimitService.checkRateLimit.mockResolvedValue({
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
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockTokenBlacklistService.blacklistToken.mockResolvedValue(undefined);
      mockSessionRepository.findActiveSessions.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Logout successful');
          expect(value.data.blacklistedTokens).toBeGreaterThan(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTokenBlacklistService.blacklistToken).toHaveBeenCalled();
      expect(mockSessionRepository.findActiveSessions).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });

    it('Given: rate limit exceeded When: logging out Then: should return RateLimitError', async () => {
      // Arrange
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        blocked: true,
        blockExpiresAt: new Date(Date.now() + 300000),
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

    it('Given: token user mismatch When: logging out Then: should return TokenError', async () => {
      // Arrange
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockResolvedValue({
        sub: 'different-user-id',
        org_id: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: mockJti,
        exp: Math.floor(Date.now() / 1000) + 3600,
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
          expect(error).toBeInstanceOf(TokenError);
        }
      );
    });

    it('Given: invalid token When: logging out Then: should still blacklist tokens', async () => {
      // Arrange
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockJwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));
      mockTokenBlacklistService.blacklistAllUserTokens.mockResolvedValue(2);
      mockSessionRepository.findActiveSessions.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.blacklistedTokens).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTokenBlacklistService.blacklistAllUserTokens).toHaveBeenCalled();
    });
  });
});
