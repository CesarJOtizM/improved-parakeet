import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export type TokenType = 'access' | 'refresh';

export interface IJwtPayload {
  sub: string; // user_id
  org_id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  type: TokenType; // token type claim
  iat: number;
  jti: string; // unique token id
}

export interface IJwtPayloadWithExp extends IJwtPayload {
  exp: number;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/** Convierte cadena de expiración (ej. '8h', '15d') a milisegundos */
function expiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry?.trim() || '');
  if (!match) return 8 * 60 * 60 * 1000; // default 8h
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? 0);
}

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService
  ) {}

  private get accessTokenExpiry(): string {
    return this.configService.get('auth')?.jwt?.accessTokenExpiry ?? '30m';
  }

  private get refreshTokenExpiry(): string {
    return this.configService.get('auth')?.jwt?.refreshTokenExpiry ?? '7d';
  }

  private get refreshTokenSecret(): string {
    return (
      this.configService.get('JWT_REFRESH_SECRET') ||
      this.configService.get('auth')?.jwt?.refreshSecret ||
      this.configService.get('auth')?.jwt?.secret + '-refresh'
    );
  }

  /**
   * Genera un par de tokens (access + refresh) para un usuario
   */
  async generateTokenPair(
    userId: string,
    orgId: string,
    email: string,
    username: string,
    roles: string[],
    permissions: string[]
  ): Promise<ITokenPair> {
    try {
      const now = new Date();
      const accessTokenExpiry = this.accessTokenExpiry;
      const refreshTokenExpiry = this.refreshTokenExpiry;
      const accessTokenExpiresAt = new Date(now.getTime() + expiryToMs(accessTokenExpiry));
      const refreshTokenExpiresAt = new Date(now.getTime() + expiryToMs(refreshTokenExpiry));

      const accessTokenPayload: IJwtPayload = {
        sub: userId,
        org_id: orgId,
        email,
        username,
        roles,
        permissions,
        type: 'access',
        iat: Math.floor(now.getTime() / 1000),
        jti: this.generateTokenId(),
      };

      const refreshTokenPayload: IJwtPayload = {
        sub: userId,
        org_id: orgId,
        email,
        username,
        roles,
        permissions,
        type: 'refresh',
        iat: Math.floor(now.getTime() / 1000),
        jti: this.generateTokenId(),
      };

      const accessToken = await this.nestJwtService.signAsync(accessTokenPayload, {
        expiresIn: accessTokenExpiry as import('ms').StringValue,
      });
      const refreshToken = await this.nestJwtService.signAsync(refreshTokenPayload, {
        expiresIn: refreshTokenExpiry as import('ms').StringValue,
        secret: this.refreshTokenSecret,
      });

      return {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      };
    } catch (error) {
      throw new Error(
        `Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  /**
   * Genera un nuevo access token usando un refresh token válido
   */
  async refreshAccessToken(
    _refreshToken: string,
    userId: string,
    orgId: string,
    email: string,
    username: string,
    roles: string[],
    permissions: string[]
  ): Promise<{ accessToken: string; accessTokenExpiresAt: Date }> {
    try {
      const now = new Date();
      const accessTokenExpiry = this.accessTokenExpiry;
      const accessTokenExpiresAt = new Date(now.getTime() + expiryToMs(accessTokenExpiry));

      const accessTokenPayload: IJwtPayload = {
        sub: userId,
        org_id: orgId,
        email,
        username,
        roles,
        permissions,
        type: 'access',
        iat: Math.floor(now.getTime() / 1000),
        jti: this.generateTokenId(),
      };

      const accessToken = await this.nestJwtService.signAsync(accessTokenPayload, {
        expiresIn: accessTokenExpiry as import('ms').StringValue,
      });

      return {
        accessToken,
        accessTokenExpiresAt,
      };
    } catch (error) {
      throw new Error(
        `Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  /**
   * Verifica y decodifica un access token JWT
   */
  async verifyToken(token: string): Promise<IJwtPayloadWithExp> {
    try {
      const payload = await this.nestJwtService.verifyAsync<IJwtPayloadWithExp>(token);
      if (payload.type && payload.type !== 'access') {
        throw new Error('Expected access token but received refresh token');
      }
      return payload;
    } catch (error) {
      throw new Error(
        `Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  /**
   * Verifica y decodifica un refresh token JWT usando el secreto de refresh
   */
  async verifyRefreshToken(token: string): Promise<IJwtPayloadWithExp> {
    try {
      const payload = await this.nestJwtService.verifyAsync<IJwtPayloadWithExp>(token, {
        secret: this.refreshTokenSecret,
      });
      if (payload.type && payload.type !== 'refresh') {
        throw new Error('Expected refresh token but received access token');
      }
      return payload;
    } catch (error) {
      throw new Error(
        `Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  /**
   * Decodifica un token JWT sin verificar la firma (útil para debugging)
   */
  decodeToken(token: string): IJwtPayloadWithExp | null {
    try {
      return this.nestJwtService.decode(token) as IJwtPayloadWithExp;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Genera un ID único criptográficamente seguro para el token
   */
  private generateTokenId(): string {
    return randomUUID();
  }

  /**
   * Extrae el token del header Authorization
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Valida si un token está próximo a expirar (útil para refresh automático)
   */
  isTokenNearExpiration(payload: IJwtPayloadWithExp, thresholdMinutes: number = 5): boolean {
    const now = Math.floor(Date.now() / 1000);
    const thresholdSeconds = thresholdMinutes * 60;
    return payload.exp - now <= thresholdSeconds;
  }
}
