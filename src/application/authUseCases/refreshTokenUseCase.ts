import { IJwtPayloadWithExp, JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, RateLimitError, Result, TokenError, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISessionRepository, IUserRepository } from '@auth/domain/repositories';

export interface IRefreshTokenRequest {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRefreshTokenData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  };
}

export type IRefreshTokenResponse = IApiResponseSuccess<IRefreshTokenData>;

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly rateLimitService: RateLimitService,
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('SessionRepository') private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(
    request: IRefreshTokenRequest
  ): Promise<Result<IRefreshTokenResponse, DomainError>> {
    try {
      // Verificar rate limiting para refresh token
      const rateLimitResult = await this.rateLimitService.checkRefreshTokenRateLimit(
        request.ipAddress || 'unknown'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Refresh token rate limit exceeded for IP: ${request.ipAddress}`);
        return err(new RateLimitError('Too many refresh attempts. Please try again later.'));
      }

      // Verificar y decodificar refresh token (uses dedicated refresh secret)
      let refreshTokenPayload: IJwtPayloadWithExp;
      try {
        refreshTokenPayload = await this.jwtService.verifyRefreshToken(request.refreshToken);
      } catch (_error) {
        // SECURITY: Log details but return generic error
        this.logger.warn('Invalid refresh token provided');
        return err(new TokenError('invalid_token'));
      }

      // Verificar que no esté en blacklist
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(
        refreshTokenPayload.jti
      );
      if (isBlacklisted) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Blacklisted refresh token used: ${refreshTokenPayload.jti}`);
        return err(new TokenError('token_blacklisted'));
      }

      // Buscar usuario
      const user = await this.userRepository.findById(
        refreshTokenPayload.sub,
        refreshTokenPayload.org_id
      );
      if (!user) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`User not found for refresh token: ${refreshTokenPayload.sub}`);
        return err(new TokenError('user_not_found'));
      }

      // Verificar que el usuario pueda hacer login
      if (!user.canLogin()) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Refresh attempt for locked/inactive user: ${user.id}`);
        return err(new TokenError('account_locked'));
      }

      // Verificar que la sesión esté activa
      const activeSession = await this.sessionRepository.findActiveByUserIdAndToken(
        user.id,
        user.orgId,
        request.refreshToken
      );

      if (!activeSession) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`No active session found for refresh token: ${refreshTokenPayload.jti}`);
        return err(new TokenError('session_not_found'));
      }

      // Generar nuevos tokens
      const newTokenPair = await this.jwtService.generateTokenPair(
        user.id,
        user.orgId,
        user.email,
        user.username,
        user.roles || [],
        user.permissions || []
      );

      // Blacklist el refresh token anterior
      await this.tokenBlacklistService.blacklistToken(
        refreshTokenPayload.jti,
        user.id,
        user.orgId,
        new Date(refreshTokenPayload.exp * 1000),
        'LOGOUT'
      );

      // Actualizar sesión con nuevo token y extender hasta que expire el refresh token
      activeSession.refreshToken(newTokenPair.accessToken);
      activeSession.update({ expiresAt: newTokenPair.refreshTokenExpiresAt });
      await this.sessionRepository.save(activeSession);

      this.logger.log(`Token refreshed successfully for user: ${user.id}`);

      return ok({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newTokenPair.accessToken,
          refreshToken: newTokenPair.refreshToken,
          accessTokenExpiresAt: newTokenPair.accessTokenExpiresAt,
          refreshTokenExpiresAt: newTokenPair.refreshTokenExpiresAt,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles || [],
            permissions: user.permissions || [],
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // SECURITY: Log full error but return generic message
      this.logger.error('Refresh token use case failed:', error);
      return err(new TokenError('internal_error'));
    }
  }
}
