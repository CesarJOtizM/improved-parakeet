import authConfig, { IAuthConfig } from '@auth/config/auth.config';

describe('AuthConfig', () => {
  // let config: IAuthConfig;

  beforeEach(() => {
    // Limpiar variables de entorno antes de cada test
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ACCESS_TOKEN_EXPIRY;
    delete process.env.JWT_REFRESH_TOKEN_EXPIRY;
    delete process.env.BCRYPT_SALT_ROUNDS;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    delete process.env.REDIS_TTL;
    delete process.env.RATE_LIMIT_IP_MAX;
    delete process.env.RATE_LIMIT_IP_WINDOW_MS;
    delete process.env.RATE_LIMIT_IP_BLOCK_DURATION_MS;
    delete process.env.RATE_LIMIT_USER_MAX;
    delete process.env.RATE_LIMIT_USER_WINDOW_MS;
    delete process.env.RATE_LIMIT_USER_BLOCK_DURATION_MS;
    delete process.env.RATE_LIMIT_LOGIN_MAX;
    delete process.env.RATE_LIMIT_LOGIN_WINDOW_MS;
    delete process.env.RATE_LIMIT_LOGIN_BLOCK_DURATION_MS;
    delete process.env.RATE_LIMIT_REFRESH_MAX;
    delete process.env.RATE_LIMIT_REFRESH_WINDOW_MS;
    delete process.env.RATE_LIMIT_REFRESH_BLOCK_DURATION_MS;
    delete process.env.MAX_FAILED_LOGIN_ATTEMPTS;
    delete process.env.LOCKOUT_DURATION_MINUTES;
    delete process.env.SESSION_TIMEOUT_MINUTES;
    delete process.env.REQUIRE_MFA;
  });

  const getConfig = (): IAuthConfig => {
    return authConfig();
  };

  describe('JWT Configuration', () => {
    describe('secret', () => {
      it('Given: no JWT_SECRET environment variable When: loading auth config Then: should use default secret', () => {
        // Arrange
        const expectedSecret = 'your-super-secret-jwt-key-change-in-production';

        // Act
        const result = getConfig().jwt.secret;

        // Assert
        expect(result).toBe(expectedSecret);
      });

      it('Given: JWT_SECRET environment variable set When: loading auth config Then: should use environment secret', () => {
        // Arrange
        const customSecret = 'custom-jwt-secret-key';
        process.env.JWT_SECRET = customSecret;

        // Act
        const result = getConfig().jwt.secret;

        // Assert
        expect(result).toBe(customSecret);
      });
    });

    describe('accessTokenExpiry', () => {
      it('Given: no JWT_ACCESS_TOKEN_EXPIRY environment variable When: loading auth config Then: should use default expiry of 15m', () => {
        // Arrange
        const expectedExpiry = '15m';

        // Act
        const result = getConfig().jwt.accessTokenExpiry;

        // Assert
        expect(result).toBe(expectedExpiry);
      });

      it('Given: JWT_ACCESS_TOKEN_EXPIRY environment variable set When: loading auth config Then: should use environment expiry', () => {
        // Arrange
        const customExpiry = '30m';
        process.env.JWT_ACCESS_TOKEN_EXPIRY = customExpiry;

        // Act
        const result = getConfig().jwt.accessTokenExpiry;

        // Assert
        expect(result).toBe(customExpiry);
      });
    });

    describe('refreshTokenExpiry', () => {
      it('Given: no JWT_REFRESH_TOKEN_EXPIRY environment variable When: loading auth config Then: should use default expiry of 7d', () => {
        // Arrange
        const expectedExpiry = '7d';

        // Act
        const result = getConfig().jwt.refreshTokenExpiry;

        // Assert
        expect(result).toBe(expectedExpiry);
      });

      it('Given: JWT_REFRESH_TOKEN_EXPIRY environment variable set When: loading auth config Then: should use environment expiry', () => {
        // Arrange
        const customExpiry = '14d';
        process.env.JWT_REFRESH_TOKEN_EXPIRY = customExpiry;

        // Act
        const result = getConfig().jwt.refreshTokenExpiry;

        // Assert
        expect(result).toBe(customExpiry);
      });
    });

    describe('saltRounds', () => {
      it('Given: no BCRYPT_SALT_ROUNDS environment variable When: loading auth config Then: should use default salt rounds of 12', () => {
        // Arrange
        const expectedSaltRounds = 12;

        // Act
        const result = getConfig().jwt.saltRounds;

        // Assert
        expect(result).toBe(expectedSaltRounds);
      });

      it('Given: BCRYPT_SALT_ROUNDS environment variable set When: loading auth config Then: should use environment salt rounds', () => {
        // Arrange
        const customSaltRounds = '16';
        process.env.BCRYPT_SALT_ROUNDS = customSaltRounds;

        // Act
        const result = getConfig().jwt.saltRounds;

        // Assert
        expect(result).toBe(16);
      });
    });
  });

  describe('Redis Configuration', () => {
    describe('host', () => {
      it('Given: no REDIS_HOST environment variable When: loading auth config Then: should use default host localhost', () => {
        // Arrange
        const expectedHost = 'localhost';

        // Act
        const result = getConfig().redis.host;

        // Assert
        expect(result).toBe(expectedHost);
      });

      it('Given: REDIS_HOST environment variable set When: loading auth config Then: should use environment host', () => {
        // Arrange
        const customHost = 'redis.example.com';
        process.env.REDIS_HOST = customHost;

        // Act
        const result = getConfig().redis.host;

        // Assert
        expect(result).toBe(customHost);
      });
    });

    describe('port', () => {
      it('Given: no REDIS_PORT environment variable When: loading auth config Then: should use default port 6379', () => {
        // Arrange
        const expectedPort = 6379;

        // Act
        const result = getConfig().redis.port;

        // Assert
        expect(result).toBe(expectedPort);
      });

      it('Given: REDIS_PORT environment variable set When: loading auth config Then: should use environment port', () => {
        // Arrange
        const customPort = '6380';
        process.env.REDIS_PORT = customPort;

        // Act
        const result = getConfig().redis.port;

        // Assert
        expect(result).toBe(6380);
      });
    });

    describe('password', () => {
      it('Given: no REDIS_PASSWORD environment variable When: loading auth config Then: should have undefined password', () => {
        // Arrange
        const expectedPassword = undefined;

        // Act
        const result = getConfig().redis.password;

        // Assert
        expect(result).toBe(expectedPassword);
      });

      it('Given: REDIS_PASSWORD environment variable set When: loading auth config Then: should use environment password', () => {
        // Arrange
        const customPassword = 'redis-password';
        process.env.REDIS_PASSWORD = customPassword;

        // Act
        const result = getConfig().redis.password;

        // Assert
        expect(result).toBe(customPassword);
      });
    });

    describe('db', () => {
      it('Given: no REDIS_DB environment variable When: loading auth config Then: should use default db 0', () => {
        // Arrange
        const expectedDb = 0;

        // Act
        const result = getConfig().redis.db;

        // Assert
        expect(result).toBe(expectedDb);
      });

      it('Given: REDIS_DB environment variable set When: loading auth config Then: should use environment db', () => {
        // Arrange
        const customDb = '1';
        process.env.REDIS_DB = customDb;

        // Act
        const result = getConfig().redis.db;

        // Assert
        expect(result).toBe(1);
      });
    });

    describe('ttl', () => {
      it('Given: no REDIS_TTL environment variable When: loading auth config Then: should use default ttl of 3600', () => {
        // Arrange
        const expectedTtl = 3600;

        // Act
        const result = getConfig().redis.ttl;

        // Assert
        expect(result).toBe(expectedTtl);
      });

      it('Given: REDIS_TTL environment variable set When: loading auth config Then: should use environment ttl', () => {
        // Arrange
        const customTtl = '7200';
        process.env.REDIS_TTL = customTtl;

        // Act
        const result = getConfig().redis.ttl;

        // Assert
        expect(result).toBe(7200);
      });
    });
  });

  describe('Rate Limit Configuration', () => {
    describe('IP Rate Limit', () => {
      it('Given: no IP rate limit environment variables When: loading auth config Then: should use default IP rate limit values', () => {
        // Arrange
        const expectedMaxRequests = 100;
        const expectedWindowMs = 60000;
        const expectedBlockDurationMs = 300000;

        // Act
        const result = getConfig().rateLimit.ip;

        // Assert
        expect(result.maxRequests).toBe(expectedMaxRequests);
        expect(result.windowMs).toBe(expectedWindowMs);
        expect(result.blockDurationMs).toBe(expectedBlockDurationMs);
      });

      it('Given: IP rate limit environment variables set When: loading auth config Then: should use environment IP rate limit values', () => {
        // Arrange
        process.env.RATE_LIMIT_IP_MAX = '200';
        process.env.RATE_LIMIT_IP_WINDOW_MS = '120000';
        process.env.RATE_LIMIT_IP_BLOCK_DURATION_MS = '600000';

        // Act
        const result = getConfig().rateLimit.ip;

        // Assert
        expect(result.maxRequests).toBe(200);
        expect(result.windowMs).toBe(120000);
        expect(result.blockDurationMs).toBe(600000);
      });
    });

    describe('User Rate Limit', () => {
      it('Given: no user rate limit environment variables When: loading auth config Then: should use default user rate limit values', () => {
        // Arrange
        const expectedMaxRequests = 1000;
        const expectedWindowMs = 3600000;
        const expectedBlockDurationMs = 900000;

        // Act
        const result = getConfig().rateLimit.user;

        // Assert
        expect(result.maxRequests).toBe(expectedMaxRequests);
        expect(result.windowMs).toBe(expectedWindowMs);
        expect(result.blockDurationMs).toBe(expectedBlockDurationMs);
      });

      it('Given: user rate limit environment variables set When: loading auth config Then: should use environment user rate limit values', () => {
        // Arrange
        process.env.RATE_LIMIT_USER_MAX = '2000';
        process.env.RATE_LIMIT_USER_WINDOW_MS = '7200000';
        process.env.RATE_LIMIT_USER_BLOCK_DURATION_MS = '1800000';

        // Act
        const result = getConfig().rateLimit.user;

        // Assert
        expect(result.maxRequests).toBe(2000);
        expect(result.windowMs).toBe(7200000);
        expect(result.blockDurationMs).toBe(1800000);
      });
    });

    describe('Login Rate Limit', () => {
      it('Given: no login rate limit environment variables When: loading auth config Then: should use default login rate limit values', () => {
        // Arrange
        const expectedMaxRequests = 5;
        const expectedWindowMs = 900000;
        const expectedBlockDurationMs = 1800000;

        // Act
        const result = getConfig().rateLimit.login;

        // Assert
        expect(result.maxRequests).toBe(expectedMaxRequests);
        expect(result.windowMs).toBe(expectedWindowMs);
        expect(result.blockDurationMs).toBe(expectedBlockDurationMs);
      });

      it('Given: login rate limit environment variables set When: loading auth config Then: should use environment login rate limit values', () => {
        // Arrange
        process.env.RATE_LIMIT_LOGIN_MAX = '10';
        process.env.RATE_LIMIT_LOGIN_WINDOW_MS = '1800000';
        process.env.RATE_LIMIT_LOGIN_BLOCK_DURATION_MS = '3600000';

        // Act
        const result = getConfig().rateLimit.login;

        // Assert
        expect(result.maxRequests).toBe(10);
        expect(result.windowMs).toBe(1800000);
        expect(result.blockDurationMs).toBe(3600000);
      });
    });

    describe('Refresh Token Rate Limit', () => {
      it('Given: no refresh token rate limit environment variables When: loading auth config Then: should use default refresh token rate limit values', () => {
        // Arrange
        const expectedMaxRequests = 10;
        const expectedWindowMs = 60000;
        const expectedBlockDurationMs = 600000;

        // Act
        const result = getConfig().rateLimit.refreshToken;

        // Assert
        expect(result.maxRequests).toBe(expectedMaxRequests);
        expect(result.windowMs).toBe(expectedWindowMs);
        expect(result.blockDurationMs).toBe(expectedBlockDurationMs);
      });

      it('Given: refresh token rate limit environment variables set When: loading auth config Then: should use environment refresh token rate limit values', () => {
        // Arrange
        process.env.RATE_LIMIT_REFRESH_MAX = '20';
        process.env.RATE_LIMIT_REFRESH_WINDOW_MS = '120000';
        process.env.RATE_LIMIT_REFRESH_BLOCK_DURATION_MS = '1200000';

        // Act
        const result = getConfig().rateLimit.refreshToken;

        // Assert
        expect(result.maxRequests).toBe(20);
        expect(result.windowMs).toBe(120000);
        expect(result.blockDurationMs).toBe(1200000);
      });
    });
  });

  describe('Security Configuration', () => {
    describe('maxFailedLoginAttempts', () => {
      it('Given: no MAX_FAILED_LOGIN_ATTEMPTS environment variable When: loading auth config Then: should use default max attempts of 5', () => {
        // Arrange
        const expectedMaxAttempts = 5;

        // Act
        const result = getConfig().security.maxFailedLoginAttempts;

        // Assert
        expect(result).toBe(expectedMaxAttempts);
      });

      it('Given: MAX_FAILED_LOGIN_ATTEMPTS environment variable set When: loading auth config Then: should use environment max attempts', () => {
        // Arrange
        const customMaxAttempts = '10';
        process.env.MAX_FAILED_LOGIN_ATTEMPTS = customMaxAttempts;

        // Act
        const result = getConfig().security.maxFailedLoginAttempts;

        // Assert
        expect(result).toBe(10);
      });
    });

    describe('lockoutDurationMinutes', () => {
      it('Given: no LOCKOUT_DURATION_MINUTES environment variable When: loading auth config Then: should use default lockout duration of 30 minutes', () => {
        // Arrange
        const expectedLockoutDuration = 30;

        // Act
        const result = getConfig().security.lockoutDurationMinutes;

        // Assert
        expect(result).toBe(expectedLockoutDuration);
      });

      it('Given: LOCKOUT_DURATION_MINUTES environment variable set When: loading auth config Then: should use environment lockout duration', () => {
        // Arrange
        const customLockoutDuration = '60';
        process.env.LOCKOUT_DURATION_MINUTES = customLockoutDuration;

        // Act
        const result = getConfig().security.lockoutDurationMinutes;

        // Assert
        expect(result).toBe(60);
      });
    });

    describe('sessionTimeoutMinutes', () => {
      it('Given: no SESSION_TIMEOUT_MINUTES environment variable When: loading auth config Then: should use default session timeout of 480 minutes', () => {
        // Arrange
        const expectedSessionTimeout = 480;

        // Act
        const result = getConfig().security.sessionTimeoutMinutes;

        // Assert
        expect(result).toBe(expectedSessionTimeout);
      });

      it('Given: SESSION_TIMEOUT_MINUTES environment variable set When: loading auth config Then: should use environment session timeout', () => {
        // Arrange
        const customSessionTimeout = '240';
        process.env.SESSION_TIMEOUT_MINUTES = customSessionTimeout;

        // Act
        const result = getConfig().security.sessionTimeoutMinutes;

        // Assert
        expect(result).toBe(240);
      });
    });

    describe('requireMfa', () => {
      it('Given: no REQUIRE_MFA environment variable When: loading auth config Then: should use default requireMfa of false', () => {
        // Arrange
        const expectedRequireMfa = false;

        // Act
        const result = getConfig().security.requireMfa;

        // Assert
        expect(result).toBe(expectedRequireMfa);
      });

      it('Given: REQUIRE_MFA environment variable set to true When: loading auth config Then: should use environment requireMfa of true', () => {
        // Arrange
        process.env.REQUIRE_MFA = 'true';

        // Act
        const result = getConfig().security.requireMfa;

        // Assert
        expect(result).toBe(true);
      });

      it('Given: REQUIRE_MFA environment variable set to false When: loading auth config Then: should use environment requireMfa of false', () => {
        // Arrange
        process.env.REQUIRE_MFA = 'false';

        // Act
        const result = getConfig().security.requireMfa;

        // Assert
        expect(result).toBe(false);
      });

      it('Given: REQUIRE_MFA environment variable set to invalid value When: loading auth config Then: should use default requireMfa of false', () => {
        // Arrange
        process.env.REQUIRE_MFA = 'invalid';

        // Act
        const result = getConfig().security.requireMfa;

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('Configuration Structure', () => {
    it('Given: all environment variables set When: loading auth config Then: should return complete configuration object with all sections', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_ACCESS_TOKEN_EXPIRY = '30m';
      process.env.JWT_REFRESH_TOKEN_EXPIRY = '14d';
      process.env.BCRYPT_SALT_ROUNDS = '16';
      process.env.REDIS_HOST = 'test-redis';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'test-password';
      process.env.REDIS_DB = '1';
      process.env.REDIS_TTL = '7200';
      process.env.RATE_LIMIT_IP_MAX = '200';
      process.env.RATE_LIMIT_USER_MAX = '2000';
      process.env.RATE_LIMIT_LOGIN_MAX = '10';
      process.env.RATE_LIMIT_REFRESH_MAX = '20';
      process.env.MAX_FAILED_LOGIN_ATTEMPTS = '10';
      process.env.LOCKOUT_DURATION_MINUTES = '60';
      process.env.SESSION_TIMEOUT_MINUTES = '240';
      process.env.REQUIRE_MFA = 'true';

      // Act
      const result = getConfig();

      // Assert
      expect(result).toHaveProperty('jwt');
      expect(result).toHaveProperty('redis');
      expect(result).toHaveProperty('rateLimit');
      expect(result).toHaveProperty('security');
      expect(result.jwt).toHaveProperty('secret');
      expect(result.jwt).toHaveProperty('accessTokenExpiry');
      expect(result.jwt).toHaveProperty('refreshTokenExpiry');
      expect(result.jwt).toHaveProperty('saltRounds');
      expect(result.redis).toHaveProperty('host');
      expect(result.redis).toHaveProperty('port');
      expect(result.redis).toHaveProperty('password');
      expect(result.redis).toHaveProperty('db');
      expect(result.redis).toHaveProperty('ttl');
      expect(result.rateLimit).toHaveProperty('ip');
      expect(result.rateLimit).toHaveProperty('user');
      expect(result.rateLimit).toHaveProperty('login');
      expect(result.rateLimit).toHaveProperty('refreshToken');
      expect(result.security).toHaveProperty('maxFailedLoginAttempts');
      expect(result.security).toHaveProperty('lockoutDurationMinutes');
      expect(result.security).toHaveProperty('sessionTimeoutMinutes');
      expect(result.security).toHaveProperty('requireMfa');
    });
  });
});
