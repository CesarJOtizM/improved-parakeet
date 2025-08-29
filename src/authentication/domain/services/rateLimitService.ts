import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // en milisegundos
  blockDurationMs?: number; // duración del bloqueo en milisegundos
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  blocked: boolean;
  blockExpiresAt?: Date;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockExpiresAt?: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly RATE_LIMIT_PREFIX = 'rate_limit:';
  private readonly BLOCK_PREFIX = 'rate_limit_block:';

  // Configuraciones por defecto
  private readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    // Rate limiting por IP
    IP: {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minuto
      blockDurationMs: 5 * 60 * 1000, // 5 minutos
    },
    // Rate limiting por usuario
    USER: {
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hora
      blockDurationMs: 15 * 60 * 1000, // 15 minutos
    },
    // Rate limiting por endpoint específico
    LOGIN: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutos
      blockDurationMs: 30 * 60 * 1000, // 30 minutos
    },
    REFRESH_TOKEN: {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minuto
      blockDurationMs: 10 * 60 * 1000, // 10 minutos
    },
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Verifica si una solicitud está permitida según el rate limiting
   */
  async checkRateLimit(
    identifier: string,
    type: keyof typeof this.DEFAULT_CONFIGS = 'IP',
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      const config = { ...this.DEFAULT_CONFIGS[type], ...customConfig };
      const key = `${this.RATE_LIMIT_PREFIX}${type}:${identifier}`;
      const blockKey = `${this.BLOCK_PREFIX}${type}:${identifier}`;

      // Verificar si está bloqueado
      const isBlocked = await this.isBlocked(blockKey);
      if (isBlocked.blocked) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(isBlocked.blockExpiresAt!),
          blocked: true,
          blockExpiresAt: new Date(isBlocked.blockExpiresAt!),
        };
      }

      // Obtener entrada actual del rate limit
      const entry = await this.getRateLimitEntry(key);
      const now = Date.now();

      // Si la ventana de tiempo ha expirado, resetear
      if (now >= entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + config.windowMs;
      }

      // Incrementar contador
      entry.count++;

      // Verificar si excede el límite
      if (entry.count > config.maxRequests) {
        // Bloquear si se excede el límite
        if (config.blockDurationMs) {
          await this.blockIdentifier(blockKey, config.blockDurationMs);
        }

        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(entry.resetTime),
          blocked: true,
          blockExpiresAt: new Date(now + (config.blockDurationMs || 0)),
        };
      }

      // Guardar entrada actualizada
      await this.saveRateLimitEntry(key, entry, config.windowMs);

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetTime: new Date(entry.resetTime),
        blocked: false,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for ${type}:${identifier}:`, error);
      // En caso de error, permitir la solicitud por seguridad
      return {
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      };
    }
  }

  /**
   * Verifica rate limiting para login (más estricto)
   */
  async checkLoginRateLimit(identifier: string, isIp: boolean = true): Promise<RateLimitResult> {
    const type = isIp ? 'IP' : 'USER';
    return this.checkRateLimit(identifier, type, this.DEFAULT_CONFIGS.LOGIN);
  }

  /**
   * Verifica rate limiting para refresh de tokens
   */
  async checkRefreshTokenRateLimit(
    identifier: string,
    isIp: boolean = true
  ): Promise<RateLimitResult> {
    const type = isIp ? 'IP' : 'USER';
    return this.checkRateLimit(identifier, type, this.DEFAULT_CONFIGS.REFRESH_TOKEN);
  }

  /**
   * Resetea el rate limiting para un identificador
   */
  async resetRateLimit(
    identifier: string,
    type: keyof typeof this.DEFAULT_CONFIGS = 'IP'
  ): Promise<void> {
    try {
      const key = `${this.RATE_LIMIT_PREFIX}${type}:${identifier}`;
      const blockKey = `${this.BLOCK_PREFIX}${type}:${identifier}`;

      await this.cacheManager.del(key);
      await this.cacheManager.del(blockKey);

      this.logger.log(`Rate limit reset for ${type}:${identifier}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for ${type}:${identifier}:`, error);
    }
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  async getRateLimitStats(): Promise<{
    totalTracked: number;
    blockedCount: number;
    configs: Record<string, RateLimitConfig>;
  }> {
    try {
      // Esta implementación es básica y puede ser optimizada
      return {
        totalTracked: 0,
        blockedCount: 0,
        configs: this.DEFAULT_CONFIGS,
      };
    } catch (error) {
      this.logger.error('Error getting rate limit stats:', error);
      return {
        totalTracked: 0,
        blockedCount: 0,
        configs: this.DEFAULT_CONFIGS,
      };
    }
  }

  /**
   * Obtiene la entrada actual del rate limit
   */
  private async getRateLimitEntry(key: string): Promise<RateLimitEntry> {
    try {
      const entry = await this.cacheManager.get<string>(key);
      if (entry) {
        return JSON.parse(entry) as RateLimitEntry;
      }
    } catch (error) {
      this.logger.warn(`Error getting rate limit entry for ${key}:`, error);
    }

    // Entrada por defecto
    return {
      count: 0,
      resetTime: Date.now() + 60000, // 1 minuto por defecto
      blocked: false,
    };
  }

  /**
   * Guarda la entrada del rate limit
   */
  private async saveRateLimitEntry(
    key: string,
    entry: RateLimitEntry,
    ttlMs: number
  ): Promise<void> {
    try {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.cacheManager.set(key, JSON.stringify(entry), ttlSeconds);
    } catch (error) {
      this.logger.warn(`Error saving rate limit entry for ${key}:`, error);
    }
  }

  /**
   * Verifica si un identificador está bloqueado
   */
  private async isBlocked(
    blockKey: string
  ): Promise<{ blocked: boolean; blockExpiresAt?: number }> {
    try {
      const blockData = await this.cacheManager.get<string>(blockKey);
      if (!blockData) {
        return { blocked: false };
      }

      const blockInfo = JSON.parse(blockData) as { blocked: boolean; blockExpiresAt: number };

      // Verificar si el bloqueo ha expirado
      if (Date.now() >= blockInfo.blockExpiresAt) {
        await this.cacheManager.del(blockKey);
        return { blocked: false };
      }

      return blockInfo;
    } catch (error) {
      this.logger.warn(`Error checking block status for ${blockKey}:`, error);
      return { blocked: false };
    }
  }

  /**
   * Bloquea un identificador por un tiempo específico
   */
  private async blockIdentifier(blockKey: string, durationMs: number): Promise<void> {
    try {
      const blockInfo = {
        blocked: true,
        blockExpiresAt: Date.now() + durationMs,
      };

      const ttlSeconds = Math.ceil(durationMs / 1000);
      await this.cacheManager.set(blockKey, JSON.stringify(blockInfo), ttlSeconds);

      this.logger.warn(`Identifier blocked: ${blockKey} for ${durationMs}ms`);
    } catch (error) {
      this.logger.error(`Error blocking identifier ${blockKey}:`, error);
    }
  }
}
