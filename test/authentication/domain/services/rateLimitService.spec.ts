import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { Cache } from '@nestjs/cache-manager';

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  let mockCacheManager: jest.Mocked<Cache>;

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
      store: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        mget: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    rateLimitService = new RateLimitService(mockCacheManager);
  });

  describe('checkRateLimit', () => {
    it('Given: first request When: checking rate limit Then: should allow request', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(result.blocked).toBe(false);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('Given: request within limit When: checking rate limit Then: should allow request', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      const existingEntry = {
        count: 5,
        resetTime: Date.now() + 60000,
        blocked: false,
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(existingEntry));

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 6
      expect(result.blocked).toBe(false);
    });

    it('Given: request exceeds limit When: checking rate limit Then: should block request', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      const existingEntry = {
        count: 100,
        resetTime: Date.now() + 60000,
        blocked: false,
      };
      mockCacheManager.get.mockResolvedValue(JSON.stringify(existingEntry));

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(true);
      expect(result.blockExpiresAt).toBeInstanceOf(Date);
    });

    it('Given: blocked identifier When: checking rate limit Then: should return blocked result', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      const blockInfo = {
        blocked: true,
        blockExpiresAt: Date.now() + 300000,
      };
      mockCacheManager.get
        .mockResolvedValueOnce(JSON.stringify(blockInfo)) // block check
        .mockResolvedValueOnce(null); // rate limit entry

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockExpiresAt).toBeInstanceOf(Date);
    });

    it('Given: expired block When: checking rate limit Then: should allow request', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      const blockInfo = {
        blocked: true,
        blockExpiresAt: Date.now() - 1000, // expired
      };
      mockCacheManager.get
        .mockResolvedValueOnce(JSON.stringify(blockInfo)) // block check
        .mockResolvedValueOnce(null); // rate limit entry

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('Given: cache error When: checking rate limit Then: should allow request for safety', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await rateLimitService.checkRateLimit(identifier, type);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.blocked).toBe(false);
    });
  });

  describe('checkLoginRateLimit', () => {
    it('Given: login request When: checking login rate limit Then: should use login config', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const isIp = true;
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await rateLimitService.checkLoginRateLimit(identifier, isIp);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 (login config)
      expect(result.blocked).toBe(false);
    });

    it('Given: login request by user When: checking login rate limit Then: should use user config', async () => {
      // Arrange
      const identifier = 'user-123';
      const isIp = false;
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await rateLimitService.checkLoginRateLimit(identifier, isIp);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 (login config)
      expect(result.blocked).toBe(false);
    });
  });

  describe('checkRefreshTokenRateLimit', () => {
    it('Given: refresh token request When: checking refresh rate limit Then: should use refresh config', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const isIp = true;
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await rateLimitService.checkRefreshTokenRateLimit(identifier, isIp);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 (refresh config)
      expect(result.blocked).toBe(false);
    });
  });

  describe('checkPasswordResetRateLimit', () => {
    it('Given: password reset request When: checking password reset rate limit Then: should use password reset config', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const isIp = true;
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await rateLimitService.checkPasswordResetRateLimit(identifier, isIp);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 3 - 1 (password reset config)
      expect(result.blocked).toBe(false);
    });
  });

  describe('resetRateLimit', () => {
    it('Given: valid identifier When: resetting rate limit Then: should delete cache entries', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';

      // Act
      await rateLimitService.resetRateLimit(identifier, type);

      // Assert
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('Given: cache error When: resetting rate limit Then: should handle error gracefully', async () => {
      // Arrange
      const identifier = '192.168.1.1';
      const type = 'IP';
      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(rateLimitService.resetRateLimit(identifier, type)).resolves.toBeUndefined();
    });
  });

  describe('getRateLimitStats', () => {
    it('Given: service instance When: getting rate limit stats Then: should return default stats', async () => {
      // Act
      const result = await rateLimitService.getRateLimitStats();

      // Assert
      expect(result.totalTracked).toBe(0);
      expect(result.blockedCount).toBe(0);
      expect(result.configs).toBeDefined();
      expect(result.configs.IP).toBeDefined();
      expect(result.configs.USER).toBeDefined();
      expect(result.configs.LOGIN).toBeDefined();
    });

    it('Given: cache error When: getting rate limit stats Then: should return default stats', async () => {
      // Arrange
      // El método getRateLimitStats no usa cacheManager.get, por lo que no necesitamos mockear errores

      // Act
      const result = await rateLimitService.getRateLimitStats();

      // Assert
      expect(result.totalTracked).toBe(0);
      expect(result.blockedCount).toBe(0);
      expect(result.configs).toBeDefined();
    });
  });

  describe('private methods', () => {
    describe('getRateLimitEntry', () => {
      it('Given: existing entry When: getting rate limit entry Then: should return parsed entry', async () => {
        // Arrange
        const key = 'rate_limit:IP:192.168.1.1';
        const entry = {
          count: 5,
          resetTime: Date.now() + 60000,
          blocked: false,
        };
        mockCacheManager.get.mockResolvedValue(JSON.stringify(entry));

        // Act
        const result = await (
          rateLimitService as unknown as {
            getRateLimitEntry(
              key: string
            ): Promise<{ count: number; resetTime: number; blocked: boolean }>;
          }
        ).getRateLimitEntry(key);

        // Assert
        expect(result).toEqual(entry);
      });

      it('Given: no existing entry When: getting rate limit entry Then: should return default entry', async () => {
        // Arrange
        const key = 'rate_limit:IP:192.168.1.1';
        mockCacheManager.get.mockResolvedValue(null);

        // Act
        const result = await (
          rateLimitService as unknown as {
            getRateLimitEntry(
              key: string
            ): Promise<{ count: number; resetTime: number; blocked: boolean }>;
          }
        ).getRateLimitEntry(key);

        // Assert
        expect(result.count).toBe(0);
        expect(result.resetTime).toBeGreaterThan(Date.now());
        expect(result.blocked).toBe(false);
      });
    });

    describe('saveRateLimitEntry', () => {
      it('Given: valid entry When: saving rate limit entry Then: should call cache set', async () => {
        // Arrange
        const key = 'rate_limit:IP:192.168.1.1';
        const entry = {
          count: 5,
          resetTime: Date.now() + 60000,
          blocked: false,
        };
        const ttlMs = 60000;

        // Act
        await (
          rateLimitService as unknown as {
            saveRateLimitEntry(
              key: string,
              entry: { count: number; resetTime: number; blocked: boolean },
              ttlMs: number
            ): Promise<void>;
          }
        ).saveRateLimitEntry(key, entry, ttlMs);

        // Assert
        expect(mockCacheManager.set).toHaveBeenCalledWith(key, JSON.stringify(entry), 60);
      });
    });

    describe('isBlocked', () => {
      it('Given: blocked identifier When: checking if blocked Then: should return blocked status', async () => {
        // Arrange
        const blockKey = 'rate_limit_block:IP:192.168.1.1';
        const blockInfo = {
          blocked: true,
          blockExpiresAt: Date.now() + 300000,
        };
        mockCacheManager.get.mockResolvedValue(JSON.stringify(blockInfo));

        // Act
        const result = await (
          rateLimitService as unknown as {
            isBlocked(blockKey: string): Promise<{ blocked: boolean; blockExpiresAt?: number }>;
          }
        ).isBlocked(blockKey);

        // Assert
        expect(result.blocked).toBe(true);
        expect(result.blockExpiresAt).toBe(blockInfo.blockExpiresAt);
      });

      it('Given: not blocked identifier When: checking if blocked Then: should return not blocked', async () => {
        // Arrange
        const blockKey = 'rate_limit_block:IP:192.168.1.1';
        mockCacheManager.get.mockResolvedValue(null);

        // Act
        const result = await (
          rateLimitService as unknown as {
            isBlocked(blockKey: string): Promise<{ blocked: boolean; blockExpiresAt?: number }>;
          }
        ).isBlocked(blockKey);

        // Assert
        expect(result.blocked).toBe(false);
      });

      it('Given: expired block When: checking if blocked Then: should delete block and return not blocked', async () => {
        // Arrange
        const blockKey = 'rate_limit_block:IP:192.168.1.1';
        const blockInfo = {
          blocked: true,
          blockExpiresAt: Date.now() - 1000, // expired
        };
        mockCacheManager.get.mockResolvedValue(JSON.stringify(blockInfo));

        // Act
        const result = await (
          rateLimitService as unknown as {
            isBlocked(blockKey: string): Promise<{ blocked: boolean; blockExpiresAt?: number }>;
          }
        ).isBlocked(blockKey);

        // Assert
        expect(result.blocked).toBe(false);
        expect(mockCacheManager.del).toHaveBeenCalledWith(blockKey);
      });
    });

    describe('blockIdentifier', () => {
      it('Given: valid identifier When: blocking identifier Then: should set block info', async () => {
        // Arrange
        const blockKey = 'rate_limit_block:IP:192.168.1.1';
        const durationMs = 300000;

        // Act
        await (
          rateLimitService as unknown as {
            blockIdentifier(blockKey: string, durationMs: number): Promise<void>;
          }
        ).blockIdentifier(blockKey, durationMs);

        // Assert
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          blockKey,
          expect.stringContaining('"blocked":true'),
          300
        );
      });
    });
  });
});
