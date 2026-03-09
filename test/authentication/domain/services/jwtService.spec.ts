/* eslint-disable @typescript-eslint/no-explicit-any */
import { IJwtPayload, JwtService } from '@auth/domain/services/jwtService';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('JwtService', () => {
  let jwtService: JwtService;
  let mockNestJwtService: jest.Mocked<NestJwtService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';
  const mockEmail = 'test@example.com';
  const mockUsername = 'testuser';
  const mockRoles = ['USER', 'ADMIN'];
  const mockPermissions = ['users:read', 'users:write'];

  beforeEach(() => {
    mockNestJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
      options: {},
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
      mergeJwtOptions: jest.fn(),
      overrideSecretFromOptions: jest.fn(),
      getSecretKey: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'auth') {
          return {
            jwt: {
              accessTokenExpiry: '8h',
              refreshTokenExpiry: '15d',
              secret: 'test-secret',
              refreshSecret: 'test-refresh-secret',
            },
          };
        }
        if (key === 'JWT_REFRESH_SECRET') {
          return undefined;
        }
        return undefined;
      }),
    } as any;

    jwtService = new JwtService(mockNestJwtService, mockConfigService);
  });

  describe('generateTokenPair', () => {
    it('Given: valid user data When: generating token pair Then: should return valid token pair', async () => {
      // Arrange
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      mockNestJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      const result = await jwtService.generateTokenPair(
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(mockNestJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('Given: valid user data When: generating token pair Then: should call signAsync with correct payload', async () => {
      // Arrange
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      mockNestJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await jwtService.generateTokenPair(
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert - access token call
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          org_id: mockOrgId,
          email: mockEmail,
          username: mockUsername,
          roles: mockRoles,
          permissions: mockPermissions,
          type: 'access',
          iat: expect.any(Number),
          jti: expect.stringMatching(UUID_REGEX),
        }),
        { expiresIn: '8h' }
      );

      // Assert - refresh token call
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          org_id: mockOrgId,
          email: mockEmail,
          username: mockUsername,
          roles: mockRoles,
          permissions: mockPermissions,
          type: 'refresh',
          iat: expect.any(Number),
          jti: expect.stringMatching(UUID_REGEX),
        }),
        { expiresIn: '15d', secret: 'test-refresh-secret' }
      );
    });

    it('Given: jwt service error When: generating token pair Then: should throw error', async () => {
      // Arrange
      const errorMessage = 'JWT signing failed';
      mockNestJwtService.signAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        jwtService.generateTokenPair(
          mockUserId,
          mockOrgId,
          mockEmail,
          mockUsername,
          mockRoles,
          mockPermissions
        )
      ).rejects.toThrow(errorMessage);
    });

    it('Given: jwt service error on refresh token When: generating token pair Then: should throw error', async () => {
      // Arrange
      const errorMessage = 'JWT signing failed';
      mockNestJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(
        jwtService.generateTokenPair(
          mockUserId,
          mockOrgId,
          mockEmail,
          mockUsername,
          mockRoles,
          mockPermissions
        )
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('refreshAccessToken', () => {
    it('Given: valid refresh token and user data When: refreshing access token Then: should return new access token', async () => {
      // Arrange
      const mockRefreshToken = 'mock.refresh.token';
      const mockNewAccessToken = 'mock.new.access.token';

      mockNestJwtService.signAsync.mockResolvedValue(mockNewAccessToken);

      // Act
      const result = await jwtService.refreshAccessToken(
        mockRefreshToken,
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert
      expect(result.accessToken).toBe(mockNewAccessToken);
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(mockNestJwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('Given: valid refresh token and user data When: refreshing access token Then: should call signAsync with correct payload', async () => {
      // Arrange
      const mockRefreshToken = 'mock.refresh.token';
      const mockNewAccessToken = 'mock.new.access.token';

      mockNestJwtService.signAsync.mockResolvedValue(mockNewAccessToken);

      // Act
      await jwtService.refreshAccessToken(
        mockRefreshToken,
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          org_id: mockOrgId,
          email: mockEmail,
          username: mockUsername,
          roles: mockRoles,
          permissions: mockPermissions,
          type: 'access',
          iat: expect.any(Number),
          jti: expect.stringMatching(UUID_REGEX),
        }),
        { expiresIn: '8h' }
      );
    });

    it('Given: jwt service error When: refreshing access token Then: should throw error', async () => {
      // Arrange
      const mockRefreshToken = 'mock.refresh.token';
      const errorMessage = 'JWT signing failed';
      mockNestJwtService.signAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        jwtService.refreshAccessToken(
          mockRefreshToken,
          mockUserId,
          mockOrgId,
          mockEmail,
          mockUsername,
          mockRoles,
          mockPermissions
        )
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('verifyToken', () => {
    it('Given: valid access token When: verifying token Then: should return decoded payload', async () => {
      // Arrange
      const mockToken = 'valid.token.here';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtService.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockNestJwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
    });

    it('Given: refresh token When: verifying as access token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'refresh.token.here';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act & Assert
      await expect(jwtService.verifyToken(mockToken)).rejects.toThrow(
        'Invalid JWT token: Expected access token but received refresh token'
      );
    });

    it('Given: token without type field When: verifying token Then: should return decoded payload', async () => {
      // Arrange - legacy tokens without type field should still pass
      const mockToken = 'legacy.token.here';
      const mockPayload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtService.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
    });

    it('Given: invalid token When: verifying token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'invalid.token';
      const errorMessage = 'Invalid token signature';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(jwtService.verifyToken(mockToken)).rejects.toThrow(
        `Invalid JWT token: ${errorMessage}`
      );
    });

    it('Given: expired token When: verifying token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'expired.token';
      const errorMessage = 'Token expired';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(jwtService.verifyToken(mockToken)).rejects.toThrow(
        `Invalid JWT token: ${errorMessage}`
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('Given: valid refresh token When: verifying refresh token Then: should return decoded payload', async () => {
      // Arrange
      const mockToken = 'valid.refresh.token';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 604800,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtService.verifyRefreshToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockNestJwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('Given: access token When: verifying as refresh token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'access.token.here';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act & Assert
      await expect(jwtService.verifyRefreshToken(mockToken)).rejects.toThrow(
        'Invalid refresh token: Expected refresh token but received access token'
      );
    });

    it('Given: token without type field When: verifying as refresh token Then: should return decoded payload', async () => {
      // Arrange - legacy tokens without type field should still pass
      const mockToken = 'legacy.refresh.token';
      const mockPayload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 604800,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtService.verifyRefreshToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
    });

    it('Given: invalid refresh token When: verifying refresh token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'invalid.refresh.token';
      const errorMessage = 'Invalid token signature';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(jwtService.verifyRefreshToken(mockToken)).rejects.toThrow(
        `Invalid refresh token: ${errorMessage}`
      );
    });

    it('Given: expired refresh token When: verifying refresh token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'expired.refresh.token';
      const errorMessage = 'Token expired';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(jwtService.verifyRefreshToken(mockToken)).rejects.toThrow(
        `Invalid refresh token: ${errorMessage}`
      );
    });
  });

  describe('decodeToken', () => {
    it('Given: valid token When: decoding token Then: should return decoded payload', () => {
      // Arrange
      const mockToken = 'valid.token.here';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.decode.mockReturnValue(mockPayload);

      // Act
      const result = jwtService.decodeToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockNestJwtService.decode).toHaveBeenCalledWith(mockToken);
    });

    it('Given: invalid token When: decoding token Then: should return null', () => {
      // Arrange
      const mockToken = 'invalid.token';
      mockNestJwtService.decode.mockReturnValue(null);

      // Act
      const result = jwtService.decodeToken(mockToken);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: jwt service error When: decoding token Then: should return null', () => {
      // Arrange
      const mockToken = 'error.token';
      mockNestJwtService.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      // Act
      const result = jwtService.decodeToken(mockToken);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('Given: valid bearer token header When: extracting token Then: should return token', () => {
      // Arrange
      const authHeader = 'Bearer valid.token.here';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe('valid.token.here');
    });

    it('Given: invalid bearer token header When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = 'Invalid valid.token.here';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: empty header When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = '';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: null header When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = null as string | null;

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader!);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isTokenNearExpiration', () => {
    it('Given: token expiring soon When: checking if near expiration Then: should return true', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + 300, // 5 minutes from now
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 10); // 10 minutes threshold

      // Assert
      expect(result).toBe(true);
    });

    it('Given: token not expiring soon When: checking if near expiration Then: should return false', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + 3600, // 1 hour from now
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 5); // 5 minutes threshold

      // Assert
      expect(result).toBe(false);
    });

    it('Given: token already expired When: checking if near expiration Then: should return true', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now - 3600,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now - 300, // Expired 5 minutes ago
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 10); // 10 minutes threshold

      // Assert
      expect(result).toBe(true);
    });

    it('Given: token expiring exactly at threshold When: checking if near expiration Then: should return true', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const thresholdMinutes = 5;
      const thresholdSeconds = thresholdMinutes * 60;
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + thresholdSeconds, // Exactly at threshold
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, thresholdMinutes);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: token expiring one second after threshold When: checking if near expiration Then: should return false', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const thresholdMinutes = 5;
      const thresholdSeconds = thresholdMinutes * 60;
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + thresholdSeconds + 1, // One second after threshold
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, thresholdMinutes);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateTokenId', () => {
    it('Given: multiple token generations When: generating token ids Then: should generate unique UUIDs', () => {
      // Arrange & Act
      const id1 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();
      const id2 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();

      // Assert
      expect(id1).toMatch(UUID_REGEX);
      expect(id2).toMatch(UUID_REGEX);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTokenPair - non-Error thrown object', () => {
    it('Given: signAsync throws non-Error When: generating token pair Then: should wrap in Unknown error', async () => {
      // Arrange
      mockNestJwtService.signAsync.mockRejectedValue('string-error');

      // Act & Assert
      await expect(
        jwtService.generateTokenPair(
          mockUserId,
          mockOrgId,
          mockEmail,
          mockUsername,
          mockRoles,
          mockPermissions
        )
      ).rejects.toThrow('Invalid JWT token: Unknown error');
    });
  });

  describe('refreshAccessToken - non-Error thrown object', () => {
    it('Given: signAsync throws non-Error When: refreshing access token Then: should wrap in Unknown error', async () => {
      // Arrange
      mockNestJwtService.signAsync.mockRejectedValue('string-error');

      // Act & Assert
      await expect(
        jwtService.refreshAccessToken(
          'refresh.token',
          mockUserId,
          mockOrgId,
          mockEmail,
          mockUsername,
          mockRoles,
          mockPermissions
        )
      ).rejects.toThrow('Invalid JWT token: Unknown error');
    });
  });

  describe('verifyToken - non-Error thrown object', () => {
    it('Given: verifyAsync throws non-Error When: verifying token Then: should wrap in Unknown error', async () => {
      // Arrange
      mockNestJwtService.verifyAsync.mockRejectedValue('string-error');

      // Act & Assert
      await expect(jwtService.verifyToken('some.token')).rejects.toThrow(
        'Invalid JWT token: Unknown error'
      );
    });
  });

  describe('verifyRefreshToken - non-Error thrown object', () => {
    it('Given: verifyAsync throws non-Error When: verifying refresh token Then: should wrap in Unknown error', async () => {
      // Arrange
      mockNestJwtService.verifyAsync.mockRejectedValue('string-error');

      // Act & Assert
      await expect(jwtService.verifyRefreshToken('some.token')).rejects.toThrow(
        'Invalid refresh token: Unknown error'
      );
    });
  });

  describe('config fallback branches', () => {
    it('Given: no auth config When: generating token pair Then: should use default expiry values', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'auth') return undefined;
        return undefined;
      });

      mockNestJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce('refresh.token');

      // Act
      const result = await jwtService.generateTokenPair(
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert - should use defaults '30m' and '7d'
      expect(result.accessToken).toBe('access.token');
      expect(result.refreshToken).toBe('refresh.token');
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '30m' })
      );
    });

    it('Given: no JWT_REFRESH_SECRET and no auth refresh secret When: getting refresh secret Then: should fall back to secret + -refresh', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'auth') {
          return {
            jwt: {
              accessTokenExpiry: '1h',
              refreshTokenExpiry: '7d',
              secret: 'my-secret',
              // no refreshSecret
            },
          };
        }
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return undefined;
      });

      mockNestJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce('refresh.token');

      // Act
      await jwtService.generateTokenPair(
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert - refresh token should be signed with 'my-secret-refresh'
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        expect.objectContaining({ secret: 'my-secret-refresh' })
      );
    });

    it('Given: JWT_REFRESH_SECRET env var set When: getting refresh secret Then: should use env var', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'env-refresh-secret';
        if (key === 'auth') {
          return {
            jwt: {
              accessTokenExpiry: '1h',
              refreshTokenExpiry: '7d',
              secret: 'my-secret',
              refreshSecret: 'config-refresh-secret',
            },
          };
        }
        return undefined;
      });

      mockNestJwtService.signAsync
        .mockResolvedValueOnce('access.token')
        .mockResolvedValueOnce('refresh.token');

      // Act
      await jwtService.generateTokenPair(
        mockUserId,
        mockOrgId,
        mockEmail,
        mockUsername,
        mockRoles,
        mockPermissions
      );

      // Assert - refresh token should be signed with env var
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'refresh' }),
        expect.objectContaining({ secret: 'env-refresh-secret' })
      );
    });
  });

  describe('isTokenNearExpiration - default threshold', () => {
    it('Given: token expiring in 3 min When: checking with default threshold (5 min) Then: should return true', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + 180, // 3 minutes
      };

      // Act - use default threshold
      const result = jwtService.isTokenNearExpiration(payload);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: token expiring in 10 min When: checking with default threshold (5 min) Then: should return false', () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);
      const payload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        type: 'access',
        iat: now,
        jti: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        exp: now + 600, // 10 minutes
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload);

      // Assert
      expect(result).toBe(false);
    });
  });
});
