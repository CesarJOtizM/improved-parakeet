import { JwtToken } from '@auth/domain/valueObjects/jwtToken.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('JwtToken', () => {
  const mockTokenValue =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const mockExpiresAt = new Date(Date.now() + 3600000); // 1 hour from now

  describe('create', () => {
    it('Given: valid JWT token When: creating token Then: should create token instance', () => {
      // Act
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Assert
      expect(token).toBeInstanceOf(JwtToken);
      expect(token.getValue()).toBe(mockTokenValue);
      expect(token.getType()).toBe('ACCESS');
      expect(token.getExpirationTime()).toBe(mockExpiresAt);
    });

    it('Given: empty token value When: creating token Then: should throw error', () => {
      // Arrange
      const emptyToken = '';

      // Act & Assert
      expect(() => JwtToken.create(emptyToken, 'ACCESS', mockExpiresAt)).toThrow(
        'JWT token cannot be empty'
      );
    });

    it('Given: token with only spaces When: creating token Then: should throw error', () => {
      // Arrange
      const tokenWithSpaces = '   ';

      // Act & Assert
      expect(() => JwtToken.create(tokenWithSpaces, 'ACCESS', mockExpiresAt)).toThrow(
        'JWT token cannot be empty'
      );
    });

    it('Given: invalid token type When: creating token Then: should throw error', () => {
      // Arrange
      const invalidType = 'INVALID' as 'ACCESS' | 'REFRESH';

      // Act & Assert
      expect(() => JwtToken.create(mockTokenValue, invalidType, mockExpiresAt)).toThrow(
        'Invalid JWT token type'
      );
    });

    it('Given: expired token When: creating token Then: should throw error', () => {
      // Arrange
      const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago

      // Act & Assert
      expect(() => JwtToken.create(mockTokenValue, 'ACCESS', expiredDate)).toThrow(
        'JWT token must have a future expiration date'
      );
    });

    it('Given: token with invalid format When: creating token Then: should throw error', () => {
      // Arrange
      const invalidFormats = [
        'invalid.token',
        'part1.part2',
        'part1.part2.part3.part4',
        'no.dots',
        '.part1.part2',
        'part1..part2',
        'part1.part2.',
        '.part1.part2.part3',
      ];

      // Act & Assert
      invalidFormats.forEach(invalidFormat => {
        expect(() => JwtToken.create(invalidFormat, 'ACCESS', mockExpiresAt)).toThrow(
          'Invalid JWT format'
        );
      });
    });
  });

  describe('createAccessToken', () => {
    it('Given: valid token value and expiry minutes When: creating access token Then: should create access token', () => {
      // Arrange
      const expiryMinutes = 15;

      // Act
      const token = JwtToken.createAccessToken(mockTokenValue, expiryMinutes);

      // Assert
      expect(token).toBeInstanceOf(JwtToken);
      expect(token.getValue()).toBe(mockTokenValue);
      expect(token.getType()).toBe('ACCESS');
      expect(token.isAccessToken()).toBe(true);
      expect(token.isRefreshToken()).toBe(false);
    });

    it('Given: access token When: checking expiration time Then: should be set correctly', () => {
      // Arrange
      const expiryMinutes = 30;
      const beforeCreation = new Date();

      // Act
      const token = JwtToken.createAccessToken(mockTokenValue, expiryMinutes);
      const afterCreation = new Date();

      // Assert
      const expectedExpiry = new Date(beforeCreation.getTime() + expiryMinutes * 60 * 1000);
      expect(token.getExpirationTime().getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime());
      expect(token.getExpirationTime().getTime()).toBeLessThanOrEqual(
        afterCreation.getTime() + expiryMinutes * 60 * 1000
      );
    });
  });

  describe('createRefreshToken', () => {
    it('Given: valid token value and expiry days When: creating refresh token Then: should create refresh token', () => {
      // Arrange
      const expiryDays = 7;

      // Act
      const token = JwtToken.createRefreshToken(mockTokenValue, expiryDays);

      // Assert
      expect(token).toBeInstanceOf(JwtToken);
      expect(token.getValue()).toBe(mockTokenValue);
      expect(token.getType()).toBe('REFRESH');
      expect(token.isAccessToken()).toBe(false);
      expect(token.isRefreshToken()).toBe(true);
    });

    it('Given: refresh token When: checking expiration time Then: should be set correctly', () => {
      // Arrange
      const expiryDays = 30;
      const beforeCreation = new Date();

      // Act
      const token = JwtToken.createRefreshToken(mockTokenValue, expiryDays);
      const afterCreation = new Date();

      // Assert
      const expectedExpiry = new Date(beforeCreation.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      expect(token.getExpirationTime().getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime());
      expect(token.getExpirationTime().getTime()).toBeLessThanOrEqual(
        afterCreation.getTime() + expiryDays * 24 * 60 * 60 * 1000
      );
    });
  });

  describe('isExpired', () => {
    it('Given: valid token When: checking if expired Then: should return false', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const isExpired = token.isExpired();

      // Assert
      expect(isExpired).toBe(false);
    });

    it('Given: expired token When: checking if expired Then: should return true', async () => {
      // Arrange
      // Crear un token que pase la validación inicial pero que expire inmediatamente
      const token = JwtToken.createAccessToken(mockTokenValue, 0.001); // 0.06 seconds

      // Esperar a que expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      const isExpired = token.isExpired();

      // Assert
      expect(isExpired).toBe(true);
    });
  });

  describe('isValid', () => {
    it('Given: valid token When: checking if valid Then: should return true', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const isValid = token.isValid();

      // Assert
      expect(isValid).toBe(true);
    });

    it('Given: expired token When: checking if valid Then: should return false', async () => {
      // Arrange
      // Crear un token que pase la validación inicial pero que expire inmediatamente
      const token = JwtToken.createAccessToken(mockTokenValue, 0.001); // 0.06 seconds

      // Esperar a que expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      const isValid = token.isValid();

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('isAccessToken', () => {
    it('Given: access token When: checking if access token Then: should return true', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const isAccessToken = token.isAccessToken();

      // Assert
      expect(isAccessToken).toBe(true);
    });

    it('Given: refresh token When: checking if access token Then: should return false', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'REFRESH', mockExpiresAt);

      // Act
      const isAccessToken = token.isAccessToken();

      // Assert
      expect(isAccessToken).toBe(false);
    });
  });

  describe('isRefreshToken', () => {
    it('Given: refresh token When: checking if refresh token Then: should return true', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'REFRESH', mockExpiresAt);

      // Act
      const isRefreshToken = token.isRefreshToken();

      // Assert
      expect(isRefreshToken).toBe(true);
    });

    it('Given: access token When: checking if refresh token Then: should return false', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const isRefreshToken = token.isRefreshToken();

      // Assert
      expect(isRefreshToken).toBe(false);
    });
  });

  describe('getExpirationTime', () => {
    it('Given: token When: getting expiration time Then: should return expiration date', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const expirationTime = token.getExpirationTime();

      // Assert
      expect(expirationTime).toBe(mockExpiresAt);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('Given: valid token When: getting time until expiration Then: should return positive value', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const timeUntilExpiration = token.getTimeUntilExpiration();

      // Assert
      expect(timeUntilExpiration).toBeGreaterThan(0);
    });

    it('Given: expired token When: getting time until expiration Then: should return negative value', async () => {
      // Arrange
      // Crear un token que pase la validación inicial pero que expire inmediatamente
      const token = JwtToken.createAccessToken(mockTokenValue, 0.001); // 0.06 seconds

      // Esperar a que expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      const timeUntilExpiration = token.getTimeUntilExpiration();

      // Assert
      expect(timeUntilExpiration).toBeLessThan(0);
    });
  });

  describe('getValue', () => {
    it('Given: token When: getting value Then: should return token string', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const value = token.getValue();

      // Assert
      expect(value).toBe(mockTokenValue);
    });
  });

  describe('getType', () => {
    it('Given: access token When: getting type Then: should return ACCESS', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const type = token.getType();

      // Assert
      expect(type).toBe('ACCESS');
    });

    it('Given: refresh token When: getting type Then: should return REFRESH', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'REFRESH', mockExpiresAt);

      // Act
      const type = token.getType();

      // Assert
      expect(type).toBe('REFRESH');
    });
  });

  describe('toString', () => {
    it('Given: token When: converting to string Then: should return token string', () => {
      // Arrange
      const token = JwtToken.create(mockTokenValue, 'ACCESS', mockExpiresAt);

      // Act
      const stringValue = token.toString();

      // Assert
      expect(stringValue).toBe(mockTokenValue);
    });
  });
});
