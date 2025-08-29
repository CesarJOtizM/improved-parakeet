import { JwtPayload } from '@auth/domain/services/jwtService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly tokenBlacklistService: TokenBlacklistService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    try {
      // Verificar que el token no esté en la blacklist
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        this.logger.warn(`Token ${payload.jti} is blacklisted`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validar que el payload tenga los campos requeridos
      if (!payload.sub || !payload.org_id || !payload.email) {
        this.logger.error('Invalid JWT payload structure', { payload });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Log de autenticación exitosa
      this.logger.debug(
        `JWT validation successful for user ${payload.sub} in org ${payload.org_id}`
      );

      return {
        sub: payload.sub,
        org_id: payload.org_id,
        email: payload.email,
        username: payload.username,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        iat: payload.iat,
        exp: payload.exp,
        jti: payload.jti,
      };
    } catch (error) {
      this.logger.error('JWT validation failed', {
        error: error instanceof Error ? error.message : String(error),
        payload,
      });
      throw error;
    }
  }
}
