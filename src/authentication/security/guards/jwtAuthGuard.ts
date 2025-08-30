import { IJwtPayload, JwtService } from '@auth/domain/services/jwtService';
import { IRateLimitResult, RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export interface IJwtAuthGuardOptions {
  requireAuth?: boolean;
  checkBlacklist?: boolean;
  checkRateLimit?: boolean;
  rateLimitType?: 'IP' | 'USER';
}

export type { IAuthenticatedUser } from '@shared/types/http.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly rateLimitService: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.getGuardOptions(context);

    // Si no se requiere autenticación, permitir acceso
    if (!options.requireAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verificar y decodificar el token
      const payload = await this.jwtService.verifyToken(token);

      // Verificar blacklist si está habilitado
      if (options.checkBlacklist) {
        const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      // Verificar rate limiting si está habilitado
      if (options.checkRateLimit) {
        const rateLimitResult = await this.checkRateLimit(request, payload, options.rateLimitType);
        if (!rateLimitResult.allowed) {
          throw new ForbiddenException('Rate limit exceeded');
        }
      }

      // Agregar información del usuario al request
      request.user = {
        id: payload.sub,
        orgId: payload.org_id,
        email: payload.email,
        username: payload.username,
        roles: payload.roles,
        permissions: payload.permissions,
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('JWT authentication failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getGuardOptions(context: ExecutionContext): IJwtAuthGuardOptions {
    const options = this.reflector.get<IJwtAuthGuardOptions>(
      'jwtAuthOptions',
      context.getHandler()
    );

    return {
      requireAuth: true,
      checkBlacklist: true,
      checkRateLimit: false,
      rateLimitType: 'IP',
      ...options,
    };
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    return this.jwtService.extractTokenFromHeader(authHeader || '');
  }

  private async checkRateLimit(
    request: Request,
    payload: IJwtPayload,
    rateLimitType?: 'IP' | 'USER'
  ): Promise<IRateLimitResult> {
    const identifier = rateLimitType === 'USER' ? payload.sub : this.getClientIp(request);

    if (rateLimitType === 'USER') {
      return this.rateLimitService.checkRateLimit(identifier, 'USER');
    } else {
      return this.rateLimitService.checkRateLimit(identifier, 'IP');
    }
  }

  private getClientIp(request: Request): string {
    // Obtener IP del cliente considerando proxies
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];

    if (typeof forwardedFor === 'string') return forwardedFor;
    if (typeof realIp === 'string') return realIp;
    if (request.connection?.remoteAddress) return request.connection.remoteAddress;
    if (request.socket?.remoteAddress) return request.socket.remoteAddress;
    if (request.ip) return request.ip;

    return 'unknown';
  }
}
