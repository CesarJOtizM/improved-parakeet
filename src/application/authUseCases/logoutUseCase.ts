import { IJwtPayloadWithExp, JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, RateLimitError, Result, TokenError, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISessionRepository } from '@auth/domain/repositories';

export interface ILogoutRequest {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  orgId: string;
  ipAddress?: string;
  reason?: 'LOGOUT' | 'SECURITY' | 'ADMIN_ACTION';
}

export interface ILogoutData {
  blacklistedTokens: number;
}

export type ILogoutResponse = IApiResponseSuccess<ILogoutData>;

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @Inject('SessionRepository') private readonly sessionRepository: ISessionRepository,
    private readonly rateLimitService: RateLimitService
  ) {}

  async execute(request: ILogoutRequest): Promise<Result<ILogoutResponse, DomainError>> {
    try {
      // Verificar rate limiting para logout
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        request.ipAddress || 'unknown',
        'IP'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Logout rate limit exceeded for IP: ${request.ipAddress}`);
        return err(new RateLimitError('Too many logout attempts. Please try again later.'));
      }

      let blacklistedTokens = 0;

      try {
        // Verificar y decodificar access token
        const accessTokenPayload: IJwtPayloadWithExp = await this.jwtService.verifyToken(
          request.accessToken
        );

        // Verificar que el token pertenezca al usuario
        if (
          accessTokenPayload.sub !== request.userId ||
          accessTokenPayload.org_id !== request.orgId
        ) {
          // SECURITY: Log details but return generic error
          this.logger.warn(`Token mismatch during logout for user: ${request.userId}`);
          return err(new TokenError('token_user_mismatch'));
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
            const refreshTokenPayload: IJwtPayloadWithExp = await this.jwtService.verifyToken(
              request.refreshToken
            );

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

        return ok({
          success: true,
          message: 'Logout successful',
          data: {
            blacklistedTokens,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (_tokenError) {
        // Si el token es inválido, aún así intentar blacklistear por seguridad
        this.logger.warn(`Invalid token during logout for user: ${request.userId}`);

        // Intentar blacklistear todos los tokens del usuario por seguridad
        const securityBlacklisted = await this.tokenBlacklistService.blacklistAllUserTokens(
          request.userId,
          request.orgId,
          'SECURITY'
        );

        blacklistedTokens = securityBlacklisted;

        // Desactivar sesión en la base de datos
        await this.deactivateUserSessions(request.userId, request.orgId);

        return ok({
          success: true,
          message: 'Logout completed with security measures',
          data: {
            blacklistedTokens,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // SECURITY: Log full error but return generic message
      this.logger.error('Logout use case failed:', error);
      return err(new TokenError('logout_failed'));
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
