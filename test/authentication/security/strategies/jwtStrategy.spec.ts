import { IJwtPayloadWithExp } from '@auth/domain/services/jwtService';
import { JwtStrategy } from '@auth/security/strategies/jwtStrategy';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTokenBlacklistService: any;

  const validPayload: IJwtPayloadWithExp = {
    sub: 'user-123',
    org_id: 'org-123',
    email: 'test@example.com',
    username: 'testuser',
    roles: ['USER', 'ADMIN'],
    permissions: ['READ', 'WRITE'],
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: 'token-123',
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-ci-only-32chars!';

    mockTokenBlacklistService = {
      isTokenBlacklisted: jest.fn(),
    };

    strategy = new JwtStrategy(mockTokenBlacklistService);
  });

  describe('validate', () => {
    it('Given: valid payload When: validating Then: should return user payload', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result).toEqual({
        sub: 'user-123',
        org_id: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['USER', 'ADMIN'],
        permissions: ['READ', 'WRITE'],
        type: 'access',
        iat: validPayload.iat,
        jti: 'token-123',
      });
    });

    it('Given: blacklisted token When: validating Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(true);

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow('Token has been revoked');
    });

    it('Given: missing sub When: validating Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const invalidPayload = { ...validPayload, sub: '' };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(invalidPayload)).rejects.toThrow('Invalid token payload');
    });

    it('Given: missing org_id When: validating Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const invalidPayload = { ...validPayload, org_id: '' };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('Given: missing email When: validating Then: should throw UnauthorizedException', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const invalidPayload = { ...validPayload, email: '' };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('Given: payload without roles When: validating Then: should return empty roles array', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const payloadWithoutRoles = { ...validPayload, roles: undefined };

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await strategy.validate(payloadWithoutRoles as any);

      // Assert
      expect(result.roles).toEqual([]);
    });

    it('Given: payload without permissions When: validating Then: should return empty permissions array', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      const payloadWithoutPermissions = { ...validPayload, permissions: undefined };

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await strategy.validate(payloadWithoutPermissions as any);

      // Assert
      expect(result.permissions).toEqual([]);
    });

    it('Given: blacklist check fails When: validating Then: should throw error', async () => {
      // Arrange
      mockTokenBlacklistService.isTokenBlacklisted.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(strategy.validate(validPayload)).rejects.toThrow('Redis error');
    });
  });
});
