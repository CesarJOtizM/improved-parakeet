import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import type { SessionRepository, UserRepository } from '@auth/domain/repositories';

export interface RefreshTokenRequest {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenResponse {
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

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly rateLimitService: RateLimitService,
    @Inject('UserRepository') private readonly userRepository: UserRepository,
    @Inject('SessionRepository') private readonly sessionRepository: SessionRepository
  ) {}

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      // Verificar rate limiting para refresh token
      const rateLimitResult = await this.rateLimitService.checkRefreshTokenRateLimit(
        request.ipAddress || 'unknown'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Refresh token rate limit exceeded for IP: ${request.ipAddress}`);
        throw new ForbiddenException('Too many refresh attempts. Please try again later.');
      }

      // Verificar y decodificar refresh token
      let refreshTokenPayload;
      try {
        refreshTokenPayload = await this.jwtService.verifyToken(request.refreshToken);
      } catch (_error) {
        this.logger.warn('Invalid refresh token provided');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verificar que no esté en blacklist
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(
        refreshTokenPayload.jti
      );
      if (isBlacklisted) {
        this.logger.warn(`Blacklisted refresh token used: ${refreshTokenPayload.jti}`);
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Buscar usuario
      const user = await this.userRepository.findById(
        refreshTokenPayload.sub,
        refreshTokenPayload.org_id
      );
      if (!user) {
        this.logger.warn(`User not found for refresh token: ${refreshTokenPayload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      // Verificar que el usuario pueda hacer login
      if (!user.canLogin()) {
        this.logger.warn(`Refresh attempt for locked/inactive user: ${user.id}`);
        throw new UnauthorizedException('Account is locked or inactive');
      }

      // Verificar que la sesión esté activa
      const activeSession = await this.sessionRepository.findActiveByUserIdAndToken(
        user.id,
        user.orgId,
        request.refreshToken
      );

      if (!activeSession) {
        this.logger.warn(`No active session found for refresh token: ${refreshTokenPayload.jti}`);
        throw new UnauthorizedException('No active session found');
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

      // Actualizar sesión con nuevo token
      activeSession.refreshToken(newTokenPair.accessToken);
      activeSession.extendExpiration(15); // 15 minutos adicionales
      await this.sessionRepository.save(activeSession);

      // Extraer JTI del nuevo refresh token para tracking
      const newRefreshTokenPayload = this.jwtService.decodeToken(newTokenPair.refreshToken);
      if (newRefreshTokenPayload) {
        await this.tokenBlacklistService.blacklistToken(
          newRefreshTokenPayload.jti,
          user.id,
          user.orgId,
          newTokenPair.refreshTokenExpiresAt,
          'SECURITY'
        );
      }

      this.logger.log(`Token refreshed successfully for user: ${user.id}`);

      return {
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
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Refresh token use case failed:', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }
}
