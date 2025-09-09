// Security Config Tests - Configuración de seguridad
// Tests unitarios para la configuración de seguridad siguiendo AAA y Given-When-Then

import { IAuthConfig } from '@auth/config/auth.config';
import { defaultSecurityConfig, getSecurityConfig } from '@shared/config/security.config';
import { SECURITY_CONFIG } from '@shared/constants';

describe('Security Config', () => {
  const originalEnv = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    // Restaurar el entorno original después de cada test
    if (originalEnv) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  describe('getSecurityConfig', () => {
    it('Given: valid auth config When: getting security config Then: should return complete config', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.headers).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.password).toBeDefined();
      expect(config.session).toBeDefined();
      expect(config.login).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.redis).toBeDefined();
    });

    it('Given: auth config with security settings When: getting config Then: should use auth config security settings', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 600, // 10 horas
          maxFailedLoginAttempts: 3,
          lockoutDurationMinutes: 60,
          requireMfa: true,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.session.timeoutMinutes).toBe(600);
      expect(config.login.maxFailedAttempts).toBe(3);
      expect(config.login.lockoutDurationMinutes).toBe(60);
      expect(config.login.requireMfa).toBe(true);
    });

    it('Given: auth config with JWT settings When: getting config Then: should use auth config JWT settings', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'custom-jwt-secret',
          accessTokenExpiry: '30m',
          refreshTokenExpiry: '14d',
          saltRounds: 14,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.jwt.secret).toBe('custom-jwt-secret');
      expect(config.jwt.accessTokenExpiry).toBe('30m');
      expect(config.jwt.refreshTokenExpiry).toBe('14d');
      expect(config.jwt.saltRounds).toBe(14);
    });

    it('Given: auth config with Redis settings When: getting config Then: should use auth config Redis settings', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'redis.example.com',
          port: 6380,
          password: 'redis-password',
          db: 1,
          ttl: 7200,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.redis.host).toBe('redis.example.com');
      expect(config.redis.port).toBe(6380);
      expect(config.redis.password).toBe('redis-password');
      expect(config.redis.db).toBe(1);
      expect(config.redis.ttl).toBe(7200);
    });

    it('Given: ALLOWED_ORIGINS environment variable When: getting config Then: should use environment variable', () => {
      // Arrange
      process.env.ALLOWED_ORIGINS = 'https://app1.com,https://app2.com';
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.cors.allowedOrigins).toEqual(['https://app1.com', 'https://app2.com']);
    });

    it('Given: no ALLOWED_ORIGINS environment variable When: getting config Then: should use default origins', () => {
      // Arrange
      delete process.env.ALLOWED_ORIGINS;
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.cors.allowedOrigins).toEqual(['http://localhost:3000']);
    });

    it('Given: auth config When: getting config Then: should use security constants for headers', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.headers).toBe(SECURITY_CONFIG.SECURITY_HEADERS);
    });

    it('Given: auth config When: getting config Then: should use security constants for password policy', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.password.minLength).toBe(SECURITY_CONFIG.PASSWORD_MIN_LENGTH);
      expect(config.password.requireUppercase).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE);
      expect(config.password.requireLowercase).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE);
      expect(config.password.requireNumbers).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS);
      expect(config.password.requireSpecialChars).toBe(
        SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS
      );
    });

    it('Given: auth config When: getting config Then: should use security constants for session settings', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.session.maxActiveSessions).toBe(SECURITY_CONFIG.SESSION_MAX_ACTIVE_SESSIONS);
      expect(config.session.inactivityTimeoutMs).toBe(
        SECURITY_CONFIG.SESSION_INACTIVITY_TIMEOUT_MS
      );
      expect(config.session.timeoutMinutes).toBe(480);
    });

    it('Given: auth config When: getting config Then: should have correct CORS settings', () => {
      // Arrange
      const mockAuthConfig = {
        security: {
          sessionTimeoutMinutes: 480,
          maxFailedLoginAttempts: 5,
          lockoutDurationMinutes: 30,
          requireMfa: false,
        },
        jwt: {
          secret: 'test-secret',
          accessTokenExpiry: '15m',
          refreshTokenExpiry: '7d',
          saltRounds: 12,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
          ttl: 3600,
        },
      };

      // Act
      const config = getSecurityConfig(mockAuthConfig as IAuthConfig);

      // Assert
      expect(config.cors.maxAge).toBe(SECURITY_CONFIG.CORS_MAX_AGE);
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
      expect(config.cors.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'X-Organization-ID',
        'X-Organization-Slug',
      ]);
    });
  });

  describe('defaultSecurityConfig', () => {
    it('Given: default config When: checking structure Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.headers).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.password).toBeDefined();
      expect(config.session).toBeDefined();
      expect(config.login).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.redis).toBeDefined();
    });

    it('Given: default config When: checking headers Then: should use security constants', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.headers).toBe(SECURITY_CONFIG.SECURITY_HEADERS);
    });

    it('Given: default config When: checking CORS Then: should have correct CORS settings', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.cors.maxAge).toBe(SECURITY_CONFIG.CORS_MAX_AGE);
      expect(config.cors.allowedOrigins).toEqual(['http://localhost:3000']);
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
      expect(config.cors.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'X-Organization-ID',
        'X-Organization-Slug',
      ]);
    });

    it('Given: default config When: checking password policy Then: should use security constants', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.password.minLength).toBe(SECURITY_CONFIG.PASSWORD_MIN_LENGTH);
      expect(config.password.requireUppercase).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE);
      expect(config.password.requireLowercase).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE);
      expect(config.password.requireNumbers).toBe(SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS);
      expect(config.password.requireSpecialChars).toBe(
        SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS
      );
    });

    it('Given: default config When: checking session settings Then: should use security constants', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.session.maxActiveSessions).toBe(SECURITY_CONFIG.SESSION_MAX_ACTIVE_SESSIONS);
      expect(config.session.inactivityTimeoutMs).toBe(
        SECURITY_CONFIG.SESSION_INACTIVITY_TIMEOUT_MS
      );
      expect(config.session.timeoutMinutes).toBe(480);
    });

    it('Given: default config When: checking login settings Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.login.maxFailedAttempts).toBe(5);
      expect(config.login.lockoutDurationMinutes).toBe(30);
      expect(config.login.requireMfa).toBe(false);
    });

    it('Given: default config When: checking JWT settings Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.jwt.secret).toBe('your-super-secret-jwt-key-change-in-production');
      expect(config.jwt.accessTokenExpiry).toBe('15m');
      expect(config.jwt.refreshTokenExpiry).toBe('7d');
      expect(config.jwt.saltRounds).toBe(12);
    });

    it('Given: default config When: checking Redis settings Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultSecurityConfig;

      // Assert
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.password).toBeUndefined();
      expect(config.redis.db).toBe(0);
      expect(config.redis.ttl).toBe(3600);
    });
  });
});
