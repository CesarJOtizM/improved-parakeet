import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    saltRounds: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
  rateLimit: {
    ip: {
      maxRequests: number;
      windowMs: number;
      blockDurationMs: number;
    };
    user: {
      maxRequests: number;
      windowMs: number;
      blockDurationMs: number;
    };
    login: {
      maxRequests: number;
      windowMs: number;
      blockDurationMs: number;
    };
    refreshToken: {
      maxRequests: number;
      windowMs: number;
      blockDurationMs: number;
    };
  };
  security: {
    maxFailedLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    requireMfa: boolean;
  };
}

export default registerAs(
  'auth',
  (): AuthConfig => ({
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hora por defecto
    },
    rateLimit: {
      ip: {
        maxRequests: parseInt(process.env.RATE_LIMIT_IP_MAX || '100', 10),
        windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS || '60000', 10), // 1 minuto
        blockDurationMs: parseInt(process.env.RATE_LIMIT_IP_BLOCK_DURATION_MS || '300000', 10), // 5 minutos
      },
      user: {
        maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '1000', 10),
        windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '3600000', 10), // 1 hora
        blockDurationMs: parseInt(process.env.RATE_LIMIT_USER_BLOCK_DURATION_MS || '900000', 10), // 15 minutos
      },
      login: {
        maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
        windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000', 10), // 15 minutos
        blockDurationMs: parseInt(process.env.RATE_LIMIT_LOGIN_BLOCK_DURATION_MS || '1800000', 10), // 30 minutos
      },
      refreshToken: {
        maxRequests: parseInt(process.env.RATE_LIMIT_REFRESH_MAX || '10', 10),
        windowMs: parseInt(process.env.RATE_LIMIT_REFRESH_WINDOW_MS || '60000', 10), // 1 minuto
        blockDurationMs: parseInt(process.env.RATE_LIMIT_REFRESH_BLOCK_DURATION_MS || '600000', 10), // 10 minutos
      },
    },
    security: {
      maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
      lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '480', 10), // 8 horas
      requireMfa: process.env.REQUIRE_MFA === 'true',
    },
  })
);
