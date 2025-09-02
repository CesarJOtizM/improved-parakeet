// Rate Limit Config Tests - Configuración de rate limiting
// Tests unitarios para la configuración de rate limiting siguiendo AAA y Given-When-Then

import { IAuthConfig } from '@auth/config/auth.config';
import { defaultRateLimitConfig, getRateLimitConfig } from '@shared/config/rateLimit.config';

describe('Rate Limit Config', () => {
  describe('getRateLimitConfig', () => {
    it('Given: valid auth config When: getting rate limit config Then: should return complete config', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            blockDurationMs: 60 * 60 * 1000,
          },
          user: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 200,
            blockDurationMs: 60 * 60 * 1000,
          },
          login: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
            blockDurationMs: 60 * 60 * 1000,
          },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.ip).toBeDefined();
      expect(config.user).toBeDefined();
      expect(config.login).toBeDefined();
      expect(config.refreshToken).toBeDefined();
      expect(config.import).toBeDefined();
      expect(config.reports).toBeDefined();
      expect(config.admin).toBeDefined();
    });

    it('Given: auth config with IP settings When: getting config Then: should use auth config IP settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: {
            windowMs: 30 * 60 * 1000, // 30 minutos
            maxRequests: 150,
            blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas
          },
          user: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 200,
            blockDurationMs: 60 * 60 * 1000,
          },
          login: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
            blockDurationMs: 60 * 60 * 1000,
          },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.ip.windowMs).toBe(30 * 60 * 1000);
      expect(config.ip.maxRequests).toBe(150);
      expect(config.ip.blockDurationMs).toBe(2 * 60 * 60 * 1000);
    });

    it('Given: auth config with user settings When: getting config Then: should use auth config user settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            blockDurationMs: 60 * 60 * 1000,
          },
          user: {
            windowMs: 10 * 60 * 1000, // 10 minutos
            maxRequests: 300,
            blockDurationMs: 30 * 60 * 1000, // 30 minutos
          },
          login: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
            blockDurationMs: 60 * 60 * 1000,
          },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.user.windowMs).toBe(10 * 60 * 1000);
      expect(config.user.maxRequests).toBe(300);
      expect(config.user.blockDurationMs).toBe(30 * 60 * 1000);
    });

    it('Given: auth config with login settings When: getting config Then: should use auth config login settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            blockDurationMs: 60 * 60 * 1000,
          },
          user: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 200,
            blockDurationMs: 60 * 60 * 1000,
          },
          login: {
            windowMs: 5 * 60 * 1000, // 5 minutos
            maxRequests: 3,
            blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas
          },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.login.windowMs).toBe(5 * 60 * 1000);
      expect(config.login.maxRequests).toBe(3);
      expect(config.login.blockDurationMs).toBe(2 * 60 * 60 * 1000);
    });

    it('Given: auth config with refresh token settings When: getting config Then: should use auth config refresh token settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
            blockDurationMs: 60 * 60 * 1000,
          },
          user: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 200,
            blockDurationMs: 60 * 60 * 1000,
          },
          login: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 5,
            blockDurationMs: 60 * 60 * 1000,
          },
          refreshToken: {
            windowMs: 30 * 60 * 1000, // 30 minutos
            maxRequests: 20,
            blockDurationMs: 3 * 60 * 60 * 1000, // 3 horas
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.refreshToken.windowMs).toBe(30 * 60 * 1000);
      expect(config.refreshToken.maxRequests).toBe(20);
      expect(config.refreshToken.blockDurationMs).toBe(3 * 60 * 60 * 1000);
    });

    it('Given: auth config When: getting config Then: should include hardcoded import settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: { windowMs: 15 * 60 * 1000, maxRequests: 100, blockDurationMs: 60 * 60 * 1000 },
          user: { windowMs: 15 * 60 * 1000, maxRequests: 200, blockDurationMs: 60 * 60 * 1000 },
          login: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 60 * 60 * 1000 },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.import.windowMs).toBe(60 * 60 * 1000); // 1 hora
      expect(config.import.maxRequests).toBe(5);
      expect(config.import.blockDurationMs).toBe(24 * 60 * 60 * 1000); // 24 horas
    });

    it('Given: auth config When: getting config Then: should include hardcoded reports settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: { windowMs: 15 * 60 * 1000, maxRequests: 100, blockDurationMs: 60 * 60 * 1000 },
          user: { windowMs: 15 * 60 * 1000, maxRequests: 200, blockDurationMs: 60 * 60 * 1000 },
          login: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 60 * 60 * 1000 },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.reports.windowMs).toBe(5 * 60 * 1000); // 5 minutos
      expect(config.reports.maxRequests).toBe(20);
      expect(config.reports.blockDurationMs).toBe(60 * 60 * 1000); // 1 hora
    });

    it('Given: auth config When: getting config Then: should include hardcoded admin settings', () => {
      // Arrange
      const mockAuthConfig = {
        rateLimit: {
          ip: { windowMs: 15 * 60 * 1000, maxRequests: 100, blockDurationMs: 60 * 60 * 1000 },
          user: { windowMs: 15 * 60 * 1000, maxRequests: 200, blockDurationMs: 60 * 60 * 1000 },
          login: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 60 * 60 * 1000 },
          refreshToken: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 10,
            blockDurationMs: 60 * 60 * 1000,
          },
        },
      };

      // Act
      const config = getRateLimitConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.admin.windowMs).toBe(60 * 1000); // 1 minuto
      expect(config.admin.maxRequests).toBe(50);
      expect(config.admin.blockDurationMs).toBe(10 * 60 * 1000); // 10 minutos
    });
  });

  describe('defaultRateLimitConfig', () => {
    it('Given: default config When: checking structure Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultRateLimitConfig;

      // Assert
      expect(config.windowMs).toBe(15 * 60 * 1000); // 15 minutos
      expect(config.maxRequests).toBe(100);
      expect(config.blockDurationMs).toBe(60 * 60 * 1000); // 1 hora
    });

    it('Given: default config When: checking windowMs Then: should be positive number', () => {
      // Arrange & Act
      const config = defaultRateLimitConfig;

      // Assert
      expect(config.windowMs).toBeGreaterThan(0);
      expect(typeof config.windowMs).toBe('number');
    });

    it('Given: default config When: checking maxRequests Then: should be positive number', () => {
      // Arrange & Act
      const config = defaultRateLimitConfig;

      // Assert
      expect(config.maxRequests).toBeGreaterThan(0);
      expect(typeof config.maxRequests).toBe('number');
    });

    it('Given: default config When: checking blockDurationMs Then: should be positive number', () => {
      // Arrange & Act
      const config = defaultRateLimitConfig;

      // Assert
      expect(config.blockDurationMs).toBeGreaterThan(0);
      expect(typeof config.blockDurationMs).toBe('number');
    });
  });
});
