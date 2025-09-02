import { IJwtPayload, JwtService } from '@auth/domain/services/jwtService';
import { JwtService as NestJwtService } from '@nestjs/jwt';

describe('JwtService', () => {
  let jwtService: JwtService;
  let mockNestJwtService: jest.Mocked<NestJwtService>;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    jwtService = new JwtService(mockNestJwtService);
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

      // Assert
      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          org_id: mockOrgId,
          email: mockEmail,
          username: mockUsername,
          roles: mockRoles,
          permissions: mockPermissions,
          iat: expect.any(Number),
          jti: expect.stringMatching(/^jti_\d+_[a-z0-9]+$/),
        }),
        { expiresIn: '15m' }
      );

      expect(mockNestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          org_id: mockOrgId,
          email: mockEmail,
          username: mockUsername,
          roles: mockRoles,
          permissions: mockPermissions,
          iat: expect.any(Number),
          jti: expect.stringMatching(/^jti_\d+_[a-z0-9]+$/),
        }),
        { expiresIn: '7d' }
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
          iat: expect.any(Number),
          jti: expect.stringMatching(/^jti_\d+_[a-z0-9]+$/),
        }),
        { expiresIn: '15m' }
      );
    });
  });

  describe('verifyToken', () => {
    it('Given: valid token When: verifying token Then: should return decoded payload', async () => {
      // Arrange
      const mockToken = 'valid.token.here';
      const mockPayload: IJwtPayload & { exp: number } = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        jti: 'jti_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockNestJwtService.verifyAsync.mockResolvedValue(mockPayload);

      // Act
      const result = await jwtService.verifyToken(mockToken);

      // Assert
      expect(result).toEqual(mockPayload);
      expect(mockNestJwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
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
        iat: Math.floor(Date.now() / 1000),
        jti: 'jti_123',
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
        iat: now,
        jti: 'jti_123',
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
        iat: now,
        jti: 'jti_123',
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
        iat: now - 3600,
        jti: 'jti_123',
        exp: now - 300, // Expired 5 minutes ago
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 10); // 10 minutes threshold

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('generateTokenId', () => {
    it('Given: multiple token generations When: generating token ids Then: should generate unique ids', () => {
      // Arrange & Act
      const id1 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();
      const id2 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();

      // Assert
      expect(id1).toMatch(/^jti_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^jti_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
