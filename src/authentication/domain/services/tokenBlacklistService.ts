import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface IBlacklistedToken {
  tokenId: string;
  userId: string;
  orgId: string;
  blacklistedAt: Date;
  expiresAt: Date;
  reason: 'LOGOUT' | 'SECURITY' | 'ADMIN_ACTION';
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly BLACKLIST_PREFIX = 'blacklisted_token:';
  private readonly USER_TOKENS_PREFIX = 'user_tokens:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Agrega un token al blacklist
   */
  async blacklistToken(
    tokenId: string,
    userId: string,
    orgId: string,
    expiresAt: Date,
    reason: IBlacklistedToken['reason'] = 'LOGOUT'
  ): Promise<void> {
    try {
      const blacklistedToken: IBlacklistedToken = {
        tokenId,
        userId,
        orgId,
        blacklistedAt: new Date(),
        expiresAt,
        reason,
      };

      // Calcular TTL en segundos
      const ttl = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

      // Guardar en Redis con TTL automático
      await this.cacheManager.set(
        `${this.BLACKLIST_PREFIX}${tokenId}`,
        JSON.stringify(blacklistedToken),
        ttl
      );

      // Agregar a la lista de tokens del usuario para tracking
      await this.addToUserTokensList(userId, tokenId, ttl);

      this.logger.log(`Token ${tokenId} blacklisted for user ${userId}, reason: ${reason}`);
    } catch (error) {
      this.logger.error(`Error blacklisting token ${tokenId}:`, error);
      throw new Error(
        `Failed to blacklist token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verifica si un token está en el blacklist
   */
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.cacheManager.get(`${this.BLACKLIST_PREFIX}${tokenId}`);
      return !!blacklistedToken;
    } catch (error) {
      this.logger.error(`Error checking blacklist for token ${tokenId}:`, error);
      // En caso de error, asumir que el token está blacklisted por seguridad
      return true;
    }
  }

  /**
   * Obtiene información de un token blacklisted
   */
  async getBlacklistedToken(tokenId: string): Promise<IBlacklistedToken | null> {
    try {
      const blacklistedTokenData = await this.cacheManager.get<string>(
        `${this.BLACKLIST_PREFIX}${tokenId}`
      );
      if (!blacklistedTokenData) {
        return null;
      }
      return JSON.parse(blacklistedTokenData) as IBlacklistedToken;
    } catch (error) {
      this.logger.error(`Error getting blacklisted token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Blacklist todos los tokens de un usuario (útil para logout masivo o acciones de seguridad)
   */
  async blacklistAllUserTokens(
    userId: string,
    orgId: string,
    reason: IBlacklistedToken['reason'] = 'SECURITY'
  ): Promise<number> {
    try {
      const userTokens = await this.getUserTokensList(userId);
      let blacklistedCount = 0;

      for (const tokenId of userTokens) {
        try {
          // Obtener información del token si está disponible
          const tokenInfo = await this.getBlacklistedToken(tokenId);
          if (tokenInfo) {
            await this.blacklistToken(tokenId, userId, orgId, tokenInfo.expiresAt, reason);
            blacklistedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to blacklist token ${tokenId} for user ${userId}:`, error);
        }
      }

      this.logger.log(
        `Blacklisted ${blacklistedCount} tokens for user ${userId}, reason: ${reason}`
      );
      return blacklistedCount;
    } catch (error) {
      this.logger.error(`Error blacklisting all tokens for user ${userId}:`, error);
      throw new Error(
        `Failed to blacklist all user tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Limpia tokens expirados del blacklist (útil para mantenimiento)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // Redis maneja automáticamente la expiración, pero podemos limpiar manualmente si es necesario
      // Esta implementación depende de cómo Redis esté configurado
      this.logger.log('Cleanup of expired tokens completed (handled by Redis TTL)');
      return 0;
    } catch (error) {
      this.logger.error('Error during token cleanup:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas del blacklist
   */
  async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    recentBlacklisted: number;
    usersWithBlacklistedTokens: number;
  }> {
    try {
      // Esta implementación es básica y puede ser optimizada según las necesidades
      // En producción, podrías usar Redis SCAN o mantener contadores separados
      this.logger.log('Blacklist statistics requested');
      return {
        totalBlacklisted: 0,
        recentBlacklisted: 0,
        usersWithBlacklistedTokens: 0,
      };
    } catch (error) {
      this.logger.error('Error getting blacklist stats:', error);
      return {
        totalBlacklisted: 0,
        recentBlacklisted: 0,
        usersWithBlacklistedTokens: 0,
      };
    }
  }

  /**
   * Agrega un token a la lista de tokens del usuario
   */
  private async addToUserTokensList(userId: string, tokenId: string, ttl: number): Promise<void> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const userTokens = await this.getUserTokensList(userId);

      if (!userTokens.includes(tokenId)) {
        userTokens.push(tokenId);
        await this.cacheManager.set(userTokensKey, JSON.stringify(userTokens), ttl);
      }
    } catch (error) {
      this.logger.warn(`Failed to add token ${tokenId} to user ${userId} tokens list:`, error);
    }
  }

  /**
   * Obtiene la lista de tokens de un usuario
   */
  private async getUserTokensList(userId: string): Promise<string[]> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const userTokensData = await this.cacheManager.get<string>(userTokensKey);
      return userTokensData ? JSON.parse(userTokensData) : [];
    } catch (error) {
      this.logger.warn(`Failed to get tokens list for user ${userId}:`, error);
      return [];
    }
  }
}
