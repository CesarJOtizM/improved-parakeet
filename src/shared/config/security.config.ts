import { AuthConfig } from '@auth/config/auth.config';
import { SECURITY_CONFIG } from '@shared/constants';

// Función para obtener la configuración de seguridad consolidada
export function getSecurityConfig(authConfig: AuthConfig) {
  return {
    // Headers de seguridad (desde constants)
    headers: SECURITY_CONFIG.SECURITY_HEADERS,

    // CORS
    cors: {
      maxAge: SECURITY_CONFIG.CORS_MAX_AGE,
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID'],
    },

    // Password policies
    password: {
      minLength: SECURITY_CONFIG.PASSWORD_MIN_LENGTH,
      requireUppercase: SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE,
      requireLowercase: SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE,
      requireNumbers: SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS,
      requireSpecialChars: SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS,
    },

    // Session management
    session: {
      maxActiveSessions: SECURITY_CONFIG.SESSION_MAX_ACTIVE_SESSIONS,
      inactivityTimeoutMs: SECURITY_CONFIG.SESSION_INACTIVITY_TIMEOUT_MS,
      timeoutMinutes: authConfig.security.sessionTimeoutMinutes,
    },

    // Login security
    login: {
      maxFailedAttempts: authConfig.security.maxFailedLoginAttempts,
      lockoutDurationMinutes: authConfig.security.lockoutDurationMinutes,
      requireMfa: authConfig.security.requireMfa,
    },

    // JWT configuration
    jwt: {
      secret: authConfig.jwt.secret,
      accessTokenExpiry: authConfig.jwt.accessTokenExpiry,
      refreshTokenExpiry: authConfig.jwt.refreshTokenExpiry,
      saltRounds: authConfig.jwt.saltRounds,
    },

    // Redis configuration
    redis: {
      host: authConfig.redis.host,
      port: authConfig.redis.port,
      password: authConfig.redis.password,
      db: authConfig.redis.db,
      ttl: authConfig.redis.ttl,
    },
  };
}

// Configuración por defecto (fallback si no hay auth.config)
export const defaultSecurityConfig = {
  headers: SECURITY_CONFIG.SECURITY_HEADERS,
  cors: {
    maxAge: SECURITY_CONFIG.CORS_MAX_AGE,
    allowedOrigins: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID'],
  },
  password: {
    minLength: SECURITY_CONFIG.PASSWORD_MIN_LENGTH,
    requireUppercase: SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE,
    requireLowercase: SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE,
    requireNumbers: SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS,
    requireSpecialChars: SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS,
  },
  session: {
    maxActiveSessions: SECURITY_CONFIG.SESSION_MAX_ACTIVE_SESSIONS,
    inactivityTimeoutMs: SECURITY_CONFIG.SESSION_INACTIVITY_TIMEOUT_MS,
    timeoutMinutes: 480, // 8 horas por defecto
  },
  login: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    requireMfa: false,
  },
  jwt: {
    secret: 'your-super-secret-jwt-key-change-in-production',
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
