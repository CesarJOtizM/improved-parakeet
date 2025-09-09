import { JwtService } from '@auth/domain/services/jwtService';
import { JwtService as NestJwtService } from '@nestjs/jwt';

describe('JwtService', () => {
  let jwtService: JwtService;
  let mockNestJwtService: jest.Mocked<NestJwtService>;

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockEmail = 'test@example.com';
  const mockUsername = 'testuser';
  const mockRoles = ['ADMIN', 'USER'];
  const mockPermissions = ['USERS:CREATE', 'USERS:READ'];

  beforeEach(() => {
    jest.clearAllMocks();

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
    it('Given: valid user data When: generating token pair Then: should return access and refresh tokens', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';

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
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);

      // Verify JWT service calls
      expect(mockNestJwtService.signAsync).toHaveBeenCalledTimes(2);

      // Verify access token call
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

      // Verify refresh token call
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

    it('Given: JWT service error When: generating token pair Then: should throw error', async () => {
      // Arrange
      mockNestJwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

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
      ).rejects.toThrow('Invalid JWT token: JWT signing failed');
    });
  });

  describe('refreshAccessToken', () => {
    it('Given: valid user data When: refreshing access token Then: should return new access token', async () => {
      // Arrange
      const mockRefreshToken = 'refresh-token-456';
      const mockNewAccessToken = 'new-access-token-789';

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

      // Verify JWT service call
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
      const mockToken = 'valid-token-123';
      const mockPayload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
        jti: 'jti_123456789_abc123',
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
      const mockToken = 'invalid-token-123';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token signature'));

      // Act & Assert
      await expect(jwtService.verifyToken(mockToken)).rejects.toThrow(
        'Invalid JWT token: Invalid token signature'
      );
    });

    it('Given: expired token When: verifying token Then: should throw error', async () => {
      // Arrange
      const mockToken = 'expired-token-123';
      mockNestJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      // Act & Assert
      await expect(jwtService.verifyToken(mockToken)).rejects.toThrow(
        'Invalid JWT token: Token expired'
      );
    });
  });

  describe('decodeToken', () => {
    it('Given: valid token When: decoding token Then: should return decoded payload', () => {
      // Arrange
      const mockToken = 'valid-token-123';
      const mockPayload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
        jti: 'jti_123456789_abc123',
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
      const mockToken = 'invalid-token-123';
      mockNestJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      // Act
      const result = jwtService.decodeToken(mockToken);

      // Assert
      expect(result).toBeNull();
      expect(mockNestJwtService.decode).toHaveBeenCalledWith(mockToken);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('Given: valid authorization header When: extracting token Then: should return token', () => {
      // Arrange
      const authHeader = 'Bearer valid-token-123';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe('valid-token-123');
    });

    it('Given: authorization header without Bearer When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = 'valid-token-123';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: empty authorization header When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = '';

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: null authorization header When: extracting token Then: should return null', () => {
      // Arrange
      const authHeader = null as string | null;

      // Act
      const result = jwtService.extractTokenFromHeader(authHeader!);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isTokenNearExpiration', () => {
    it('Given: token near expiration When: checking if near expiration Then: should return true', () => {
      // Arrange
      const payload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 180, // 3 minutes from now
        jti: 'jti_123456789_abc123',
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 5);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: token not near expiration When: checking if near expiration Then: should return false', () => {
      // Arrange
      const payload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        jti: 'jti_123456789_abc123',
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 5);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: expired token When: checking if near expiration Then: should return true', () => {
      // Arrange
      const payload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
        jti: 'jti_123456789_abc123',
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 5);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: custom threshold When: checking if near expiration Then: should use custom threshold', () => {
      // Arrange
      const payload = {
        sub: mockUserId,
        org_id: mockOrgId,
        email: mockEmail,
        username: mockUsername,
        roles: mockRoles,
        permissions: mockPermissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
        jti: 'jti_123456789_abc123',
      };

      // Act
      const result = jwtService.isTokenNearExpiration(payload, 10);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('generateTokenId', () => {
    it('Given: service When: generating token ID Then: should return unique ID', () => {
      // Act
      const result1 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();
      const result2 = (jwtService as unknown as { generateTokenId(): string }).generateTokenId();

      // Assert
      expect(result1).toMatch(/^jti_\d+_[a-z0-9]+$/);
      expect(result2).toMatch(/^jti_\d+_[a-z0-9]+$/);
      expect(result1).not.toBe(result2);
    });
  });
});
