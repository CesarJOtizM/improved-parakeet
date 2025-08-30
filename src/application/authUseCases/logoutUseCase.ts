import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { ISessionRepository } from '@auth/domain/repositories';

export interface ILogoutRequest {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  orgId: string;
  ipAddress?: string;
  reason?: 'LOGOUT' | 'SECURITY' | 'ADMIN_ACTION';
}

export interface ILogoutResponse {
  success: boolean;
  message: string;
  blacklistedTokens: number;
}

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject('SessionRepository') private readonly sessionRepository: ISessionRepository,
    private readonly rateLimitService: RateLimitService
  ) {}

  async execute(request: ILogoutRequest): Promise<ILogoutResponse> {
    try {
      // Verificar rate limiting para logout
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        request.ipAddress || 'unknown',
        'IP'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Logout rate limit exceeded for IP: ${request.ipAddress}`);
        throw new UnauthorizedException('Too many logout attempts. Please try again later.');
      }

      let blacklistedTokens = 0;

      try {
        // Verificar y decodificar access token
        const accessTokenPayload = await this.jwtService.verifyToken(request.accessToken);

        // Verificar que el token pertenezca al usuario
        if (
          accessTokenPayload.sub !== request.userId ||
          accessTokenPayload.org_id !== request.orgId
        ) {
          throw new UnauthorizedException('Token does not belong to the specified user');
        }

        // Blacklist access token
        await this.tokenBlacklistService.blacklistToken(
          accessTokenPayload.jti,
          request.userId,
          request.orgId,
          new Date(accessTokenPayload.exp * 1000),
          request.reason || 'LOGOUT'
        );
        blacklistedTokens++;

        // Blacklist refresh token si se proporciona
        if (request.refreshToken) {
          try {
            const refreshTokenPayload = await this.jwtService.verifyToken(request.refreshToken);

            if (
              refreshTokenPayload.sub === request.userId &&
              refreshTokenPayload.org_id === request.orgId
            ) {
              await this.tokenBlacklistService.blacklistToken(
                refreshTokenPayload.jti,
                request.userId,
                request.orgId,
                new Date(refreshTokenPayload.exp * 1000),
                request.reason || 'LOGOUT'
              );
              blacklistedTokens++;
            }
          } catch (refreshError) {
            this.logger.warn(`Failed to blacklist refresh token: ${refreshError}`);
          }
        }

        // Desactivar sesión en la base de datos
        await this.deactivateUserSessions(request.userId, request.orgId);

        this.logger.log(
          `Successful logout for user: ${request.userId}, blacklisted tokens: ${blacklistedTokens}`
        );

        return {
          success: true,
          message: 'Logout successful',
          blacklistedTokens,
        };
      } catch (tokenError) {
        if (tokenError instanceof UnauthorizedException) {
          throw tokenError;
        }

        // Si el token es inválido, aún así intentar blacklistear por seguridad
        this.logger.warn(`Invalid token during logout for user: ${request.userId}`);

        // Intentar blacklistear todos los tokens del usuario por seguridad
        const securityBlacklisted = await this.tokenBlacklistService.blacklistAllUserTokens(
          request.userId,
          request.orgId,
          'SECURITY'
        );

        blacklistedTokens = securityBlacklisted;

        return {
          success: true,
          message: 'Logout completed with security measures',
          blacklistedTokens,
        };
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Logout use case failed:', error);
      throw new UnauthorizedException('Logout failed');
    }
  }

  /**
   * Desactiva todas las sesiones activas del usuario
   */
  private async deactivateUserSessions(userId: string, orgId: string): Promise<void> {
    try {
      const activeSessions = await this.sessionRepository.findActiveSessions(userId, orgId);

      for (const session of activeSessions) {
        session.deactivate();
        await this.sessionRepository.save(session);
      }

      this.logger.log(`Deactivated ${activeSessions.length} sessions for user: ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to deactivate sessions for user: ${userId}:`, error);
    }
  }
}
