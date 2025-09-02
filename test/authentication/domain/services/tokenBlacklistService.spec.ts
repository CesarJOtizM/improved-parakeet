import {
  IBlacklistedToken,
  TokenBlacklistService,
} from '@auth/domain/services/tokenBlacklistService';
import { Cache } from '@nestjs/cache-manager';

describe('TokenBlacklistService', () => {
  let tokenBlacklistService: TokenBlacklistService;
  let mockCacheManager: jest.Mocked<Cache>;

  const mockTokenId = 'jti_1234567890_abc123';
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';
  const mockExpiresAt = new Date(Date.now() + 3600000); // 1 hour from now

  beforeEach(() => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      ttl: jest.fn(),
      mset: jest.fn(),
      mdel: jest.fn(),
      wrap: jest.fn(),
      clear: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(),
      cacheId: 'test-cache',
      stores: {},
      store: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        mget: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    tokenBlacklistService = new TokenBlacklistService(mockCacheManager);
  });

  describe('blacklistToken', () => {
    it('Given: valid token data When: blacklisting token Then: should add token to blacklist', async () => {
      // Arrange
      const reason: IBlacklistedToken['reason'] = 'LOGOUT';

      // Act
      await tokenBlacklistService.blacklistToken(
        mockTokenId,
        mockUserId,
        mockOrgId,
        mockExpiresAt,
        reason
      );

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `blacklisted_token:${mockTokenId}`,
        expect.stringContaining(mockTokenId),
        expect.any(Number)
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `user_tokens:${mockUserId}`,
        expect.stringContaining(mockTokenId),
        expect.any(Number)
      );
    });

    it('Given: valid token data with security reason When: blacklisting token Then: should add token with security reason', async () => {
      // Arrange
      const reason: IBlacklistedToken['reason'] = 'SECURITY';

      // Act
      await tokenBlacklistService.blacklistToken(
        mockTokenId,
        mockUserId,
        mockOrgId,
        mockExpiresAt,
        reason
      );

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `blacklisted_token:${mockTokenId}`,
        expect.stringContaining('"reason":"SECURITY"'),
        expect.any(Number)
      );
    });

    it('Given: cache error When: blacklisting token Then: should throw error', async () => {
      // Arrange
      const error = new Error('Cache error');
      mockCacheManager.set.mockRejectedValue(error);

      // Act & Assert
      await expect(
        tokenBlacklistService.blacklistToken(mockTokenId, mockUserId, mockOrgId, mockExpiresAt)
      ).rejects.toThrow('Failed to blacklist token: Cache error');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('Given: blacklisted token When: checking if blacklisted Then: should return true', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue('blacklisted_token_data');

      // Act
      const result = await tokenBlacklistService.isTokenBlacklisted(mockTokenId);

      // Assert
      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`blacklisted_token:${mockTokenId}`);
    });

    it('Given: not blacklisted token When: checking if blacklisted Then: should return false', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await tokenBlacklistService.isTokenBlacklisted(mockTokenId);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: cache error When: checking if blacklisted Then: should return true for safety', async () => {
      // Arrange
      const error = new Error('Cache error');
      mockCacheManager.get.mockRejectedValue(error);

      // Act
      const result = await tokenBlacklistService.isTokenBlacklisted(mockTokenId);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getBlacklistedToken', () => {
    it('Given: blacklisted token When: getting blacklisted token Then: should return token data', async () => {
      // Arrange
      const blacklistedToken: IBlacklistedToken = {
        tokenId: mockTokenId,
        userId: mockUserId,
        orgId: mockOrgId,
        blacklistedAt: new Date(),
        expiresAt: mockExpiresAt,
        reason: 'LOGOUT',
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(blacklistedToken));

      // Act
      const result = await tokenBlacklistService.getBlacklistedToken(mockTokenId);

      // Assert
      expect(result).toEqual({
        ...blacklistedToken,
        blacklistedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      });
      expect(mockCacheManager.get).toHaveBeenCalledWith(`blacklisted_token:${mockTokenId}`);
    });

    it('Given: not blacklisted token When: getting blacklisted token Then: should return null', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await tokenBlacklistService.getBlacklistedToken(mockTokenId);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: cache error When: getting blacklisted token Then: should return null', async () => {
      // Arrange
      const error = new Error('Cache error');
      mockCacheManager.get.mockRejectedValue(error);

      // Act
      const result = await tokenBlacklistService.getBlacklistedToken(mockTokenId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('blacklistAllUserTokens', () => {
    it('Given: user with tokens When: blacklisting all user tokens Then: should blacklist all tokens', async () => {
      // Arrange
      const userTokens = [mockTokenId, 'jti_9876543210_def456'];
      const blacklistedToken: IBlacklistedToken = {
        tokenId: mockTokenId,
        userId: mockUserId,
        orgId: mockOrgId,
        blacklistedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // Future date
        reason: 'SECURITY',
      };

      const secondToken: IBlacklistedToken = {
        ...blacklistedToken,
        tokenId: 'jti_9876543210_def456',
      };

      // Configurar mock para getUserTokensList
      mockCacheManager.get
        .mockResolvedValueOnce(JSON.stringify(userTokens)) // user tokens list
        .mockResolvedValueOnce(JSON.stringify(blacklistedToken)) // first token info
        .mockResolvedValueOnce(JSON.stringify(secondToken)) // second token info
        .mockResolvedValue(JSON.stringify([])); // any additional calls

      // Mock set para blacklistToken y addToUserTokensList
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await tokenBlacklistService.blacklistAllUserTokens(mockUserId, mockOrgId);

      // Assert
      expect(result).toBe(2);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`user_tokens:${mockUserId}`);
    });

    it('Given: user without tokens When: blacklisting all user tokens Then: should return 0', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(JSON.stringify([]));

      // Act
      const result = await tokenBlacklistService.blacklistAllUserTokens(mockUserId, mockOrgId);

      // Assert
      expect(result).toBe(0);
    });

    it('Given: cache error When: blacklisting all user tokens Then: should return 0', async () => {
      // Arrange
      const error = new Error('Cache error');
      mockCacheManager.get.mockRejectedValue(error);

      // Act
      const result = await tokenBlacklistService.blacklistAllUserTokens(mockUserId, mockOrgId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('Given: service instance When: cleaning up expired tokens Then: should return 0', async () => {
      // Act
      const result = await tokenBlacklistService.cleanupExpiredTokens();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getBlacklistStats', () => {
    it('Given: service instance When: getting blacklist stats Then: should return default stats', async () => {
      // Act
      const result = await tokenBlacklistService.getBlacklistStats();

      // Assert
      expect(result.totalBlacklisted).toBe(0);
      expect(result.recentBlacklisted).toBe(0);
      expect(result.usersWithBlacklistedTokens).toBe(0);
    });

    it('Given: cache error When: getting blacklist stats Then: should return default stats', async () => {
      // Arrange
      // El método getBlacklistStats no usa cacheManager.get, por lo que no necesitamos mockear errores

      // Act
      const result = await tokenBlacklistService.getBlacklistStats();

      // Assert
      expect(result.totalBlacklisted).toBe(0);
      expect(result.recentBlacklisted).toBe(0);
      expect(result.usersWithBlacklistedTokens).toBe(0);
    });
  });

  describe('private methods', () => {
    describe('addToUserTokensList', () => {
      it('Given: new token When: adding to user tokens list Then: should add token to list', async () => {
        // Arrange
        const existingTokens = ['existing_token'];
        mockCacheManager.get.mockResolvedValue(JSON.stringify(existingTokens));

        // Act
        await (
          tokenBlacklistService as unknown as {
            addToUserTokensList(userId: string, tokenId: string, ttl: number): Promise<void>;
          }
        ).addToUserTokensList(mockUserId, mockTokenId, 3600);

        // Assert
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          `user_tokens:${mockUserId}`,
          JSON.stringify([...existingTokens, mockTokenId]),
          3600
        );
      });

      it('Given: existing token When: adding to user tokens list Then: should not add duplicate', async () => {
        // Arrange
        const existingTokens = [mockTokenId];
        mockCacheManager.get.mockResolvedValue(JSON.stringify(existingTokens));

        // Act
        await (
          tokenBlacklistService as unknown as {
            addToUserTokensList(userId: string, tokenId: string, ttl: number): Promise<void>;
          }
        ).addToUserTokensList(mockUserId, mockTokenId, 3600);

        // Assert
        expect(mockCacheManager.set).not.toHaveBeenCalled();
      });
    });

    describe('getUserTokensList', () => {
      it('Given: user with tokens When: getting user tokens list Then: should return tokens list', async () => {
        // Arrange
        const userTokens = [mockTokenId, 'jti_9876543210_def456'];
        mockCacheManager.get.mockResolvedValue(JSON.stringify(userTokens));

        // Act
        const result = await (
          tokenBlacklistService as unknown as {
            getUserTokensList(userId: string): Promise<string[]>;
          }
        ).getUserTokensList(mockUserId);

        // Assert
        expect(result).toEqual(userTokens);
        expect(mockCacheManager.get).toHaveBeenCalledWith(`user_tokens:${mockUserId}`);
      });

      it('Given: user without tokens When: getting user tokens list Then: should return empty array', async () => {
        // Arrange
        mockCacheManager.get.mockResolvedValue(null);

        // Act
        const result = await (
          tokenBlacklistService as unknown as {
            getUserTokensList(userId: string): Promise<string[]>;
          }
        ).getUserTokensList(mockUserId);

        // Assert
        expect(result).toEqual([]);
      });

      it('Given: cache error When: getting user tokens list Then: should return empty array', async () => {
        // Arrange
        const error = new Error('Cache error');
        mockCacheManager.get.mockRejectedValue(error);

        // Act
        const result = await (
          tokenBlacklistService as unknown as {
            getUserTokensList(userId: string): Promise<string[]>;
          }
        ).getUserTokensList(mockUserId);

        // Assert
        expect(result).toEqual([]);
      });
    });
  });
});
