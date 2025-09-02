/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('JwtAuthGuard', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockTokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockToken = 'valid-token-123';
  const mockPayload = {
    sub: mockUserId,
    org_id: mockOrgId,
    email: 'test@example.com',
    username: 'testuser',
    roles: ['USER'],
    permissions: ['USERS:READ'],
    iat: Math.floor(Date.now() / 1000),
    jti: 'jti_123456789_abc123',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockJwtService = {
      verifyToken: jest.fn(),
      extractTokenFromHeader: jest.fn(),
      generateTokenPair: jest.fn(),
      refreshAccessToken: jest.fn(),
      decodeToken: jest.fn(),
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

    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as jest.Mocked<Reflector>;

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: `Bearer ${mockToken}` },
          ip: '192.168.1.1',
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as jest.Mocked<ExecutionContext>;

    // Create guard instance
    jwtAuthGuard = new JwtAuthGuard(
      mockReflector,
      mockJwtService,
      mockTokenBlacklistService,
      mockRateLimitService
    );
  });

  describe('canActivate', () => {
    it('Given: valid token and no auth required When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: false });

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockJwtService.verifyToken).not.toHaveBeenCalled();
    });

    it('Given: valid token and auth required When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true, checkBlacklist: true });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockJwtService.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(mockTokenBlacklistService.isTokenBlacklisted).toHaveBeenCalledWith(
        'jti_123456789_abc123'
      );

      // Verify user is added to request
      const request = mockExecutionContext.switchToHttp().getRequest();
      expect(request.user).toEqual({
        id: mockUserId,
        orgId: mockOrgId,
        email: 'test@example.com',
        username: 'testuser',
        roles: ['USER'],
        permissions: ['USERS:READ'],
        jti: 'jti_123456789_abc123',
      });
    });

    it('Given: no token When: checking access Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true });
      mockJwtService.extractTokenFromHeader.mockReturnValue(null);

      // Act & Assert
      await expect(jwtAuthGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Access token is required')
      );
    });

    it('Given: invalid token When: checking access Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(jwtAuthGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token')
      );
    });

    it('Given: blacklisted token When: checking access Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true, checkBlacklist: true });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(true);

      // Act & Assert
      await expect(jwtAuthGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked')
      );
    });

    it('Given: rate limit exceeded When: checking access Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requireAuth: true,
        checkRateLimit: true,
        rateLimitType: 'IP',
      });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        blocked: true,
      });

      // Act & Assert
      await expect(jwtAuthGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        new ForbiddenException('Rate limit exceeded')
      );
    });

    it('Given: rate limit check disabled When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true, checkRateLimit: false });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockRateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('Given: blacklist check disabled When: checking access Then: should allow access without blacklist check', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requireAuth: true, checkBlacklist: false });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockTokenBlacklistService.isTokenBlacklisted).not.toHaveBeenCalled();
    });

    it('Given: user-based rate limiting When: checking access Then: should use user ID for rate limiting', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requireAuth: true,
        checkRateLimit: true,
        rateLimitType: 'USER',
      });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(),
        blocked: false,
      });

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(mockUserId, 'USER');
    });

    it('Given: IP-based rate limiting When: checking access Then: should use IP address for rate limiting', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requireAuth: true,
        checkRateLimit: true,
        rateLimitType: 'IP',
      });
      mockJwtService.extractTokenFromHeader.mockReturnValue(mockToken);
      mockJwtService.verifyToken.mockResolvedValue(mockPayload);
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(),
        blocked: false,
      });

      // Act
      const result = await jwtAuthGuard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 'IP');
    });
  });

  describe('getGuardOptions', () => {
    it('Given: no options provided When: getting guard options Then: should return default options', () => {
      // Arrange
      mockReflector.get.mockReturnValue(undefined);

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getGuardOptions(context: ExecutionContext): {
            requireAuth: boolean;
            checkBlacklist: boolean;
            checkRateLimit: boolean;
            rateLimitType: 'IP' | 'USER';
          };
        }
      ).getGuardOptions(mockExecutionContext);

      // Assert
      expect(result).toEqual({
        requireAuth: true,
        checkBlacklist: true,
        checkRateLimit: false,
        rateLimitType: 'IP',
      });
    });

    it('Given: custom options provided When: getting guard options Then: should merge with defaults', () => {
      // Arrange
      const customOptions = {
        requireAuth: false,
        checkRateLimit: true,
        rateLimitType: 'USER' as const,
      };
      mockReflector.get.mockReturnValue(customOptions);

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getGuardOptions(context: ExecutionContext): {
            requireAuth: boolean;
            checkBlacklist: boolean;
            checkRateLimit: boolean;
            rateLimitType: 'IP' | 'USER';
          };
        }
      ).getGuardOptions(mockExecutionContext);

      // Assert
      expect(result).toEqual({
        requireAuth: false,
        checkBlacklist: true,
        checkRateLimit: true,
        rateLimitType: 'USER',
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('Given: valid authorization header When: extracting token Then: should return token', () => {
      // Arrange
      const request = {
        headers: { authorization: 'Bearer valid-token-123' },
      };

      // Mock the JwtService method
      mockJwtService.extractTokenFromHeader.mockReturnValue('valid-token-123');

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          extractTokenFromHeader(request: { headers: { authorization?: string } }): string | null;
        }
      ).extractTokenFromHeader(request);

      // Assert
      expect(result).toBe('valid-token-123');
      expect(mockJwtService.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token-123');
    });

    it('Given: invalid authorization header When: extracting token Then: should return null', () => {
      // Arrange
      const request = {
        headers: { authorization: 'invalid-token-123' },
      };

      // Mock the JwtService method
      mockJwtService.extractTokenFromHeader.mockReturnValue(null);

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          extractTokenFromHeader(request: { headers: { authorization?: string } }): string | null;
        }
      ).extractTokenFromHeader(request);

      // Assert
      expect(result).toBeNull();
      expect(mockJwtService.extractTokenFromHeader).toHaveBeenCalledWith('invalid-token-123');
    });
  });

  describe('getClientIp', () => {
    it('Given: request with x-forwarded-for When: getting client IP Then: should return forwarded IP', () => {
      // Arrange
      const request = {
        headers: { 'x-forwarded-for': '10.0.0.1' },
        ip: '192.168.1.1',
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: {
            headers: { 'x-forwarded-for'?: string; 'x-real-ip'?: string };
            ip: string;
          }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('10.0.0.1');
    });

    it('Given: request with x-real-ip When: getting client IP Then: should return real IP', () => {
      // Arrange
      const request = {
        headers: { 'x-real-ip': '10.0.0.2' },
        ip: '192.168.1.1',
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: {
            headers: { 'x-forwarded-for'?: string; 'x-real-ip'?: string };
            ip: string;
          }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('10.0.0.2');
    });

    it('Given: request with connection remote address When: getting client IP Then: should return connection IP', () => {
      // Arrange
      const request = {
        headers: {},
        connection: { remoteAddress: '10.0.0.3' },
        ip: '192.168.1.1',
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: {
            headers: Record<string, unknown>;
            connection: { remoteAddress: string };
          }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('10.0.0.3');
    });

    it('Given: request with socket remote address When: getting client IP Then: should return socket IP', () => {
      // Arrange
      const request = {
        headers: {},
        socket: { remoteAddress: '10.0.0.4' },
        ip: '192.168.1.1',
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: {
            headers: Record<string, unknown>;
            socket: { remoteAddress: string };
          }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('10.0.0.4');
    });

    it('Given: request with ip property When: getting client IP Then: should return IP property', () => {
      // Arrange
      const request = {
        headers: {},
        ip: '192.168.1.1',
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: { headers: Record<string, unknown>; ip: string }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('192.168.1.1');
    });

    it('Given: request without IP information When: getting client IP Then: should return unknown', () => {
      // Arrange
      const request = {
        headers: {},
      };

      // Act
      const result = (
        jwtAuthGuard as unknown as {
          getClientIp(request: { headers: Record<string, unknown> }): string;
        }
      ).getClientIp(request);

      // Assert
      expect(result).toBe('unknown');
    });
  });
});
