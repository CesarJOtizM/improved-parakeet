import { AuthConfig } from '@auth/config/auth.config';
import { RateLimitConfig } from '@auth/domain/services/rateLimitService';

// Función para obtener la configuración de rate limiting desde auth.config.ts
export function getRateLimitConfig(authConfig: AuthConfig): Record<string, RateLimitConfig> {
  return {
    // Rate limiting por IP (general)
    ip: {
      windowMs: authConfig.rateLimit.ip.windowMs,
      maxRequests: authConfig.rateLimit.ip.maxRequests,
      blockDurationMs: authConfig.rateLimit.ip.blockDurationMs,
    },

    // Rate limiting por usuario autenticado
    user: {
      windowMs: authConfig.rateLimit.user.windowMs,
      maxRequests: authConfig.rateLimit.user.maxRequests,
      blockDurationMs: authConfig.rateLimit.user.blockDurationMs,
    },

    // Rate limiting para endpoints de login
    login: {
      windowMs: authConfig.rateLimit.login.windowMs,
      maxRequests: authConfig.rateLimit.login.maxRequests,
      blockDurationMs: authConfig.rateLimit.login.blockDurationMs,
    },

    // Rate limiting para refresh tokens
    refreshToken: {
      windowMs: authConfig.rateLimit.refreshToken.windowMs,
      maxRequests: authConfig.rateLimit.refreshToken.maxRequests,
      blockDurationMs: authConfig.rateLimit.refreshToken.blockDurationMs,
    },

    // Rate limiting para importaciones masivas
    import: {
      windowMs: 60 * 60 * 1000, // 1 hora
      maxRequests: 5, // máximo 5 imports por hora
      blockDurationMs: 24 * 60 * 60 * 1000, // bloquear por 24 horas
    },

    // Rate limiting para reportes
    reports: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      maxRequests: 20, // máximo 20 reportes por 5 minutos
      blockDurationMs: 60 * 60 * 1000, // bloquear por 1 hora
    },

    // Rate limiting para operaciones de administración
    admin: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 50, // máximo 50 operaciones admin por minuto
      blockDurationMs: 10 * 60 * 1000, // bloquear por 10 minutos
    },
  };
}

// Configuración por defecto (fallback si no hay auth.config)
export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 100, // máximo 100 requests por ventana
  blockDurationMs: 60 * 60 * 1000, // bloquear por 1 hora si se excede
};
