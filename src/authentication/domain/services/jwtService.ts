import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // user_id
  org_id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // unique token id
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class JwtService {
  constructor(private readonly nestJwtService: NestJwtService) {}

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
  ): Promise<TokenPair> {
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos
    const refreshTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const accessTokenPayload: JwtPayload = {
      sub: userId,
      org_id: orgId,
      email,
      username,
      roles,
      permissions,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(accessTokenExpiresAt.getTime() / 1000),
      jti: this.generateTokenId(),
    };

    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      org_id: orgId,
      email,
      username,
      roles,
      permissions,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(refreshTokenExpiresAt.getTime() / 1000),
      jti: this.generateTokenId(),
    };

    const accessToken = await this.nestJwtService.signAsync(accessTokenPayload);
    const refreshToken = await this.nestJwtService.signAsync(refreshTokenPayload);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
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
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos

    const accessTokenPayload: JwtPayload = {
      sub: userId,
      org_id: orgId,
      email,
      username,
      roles,
      permissions,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(accessTokenExpiresAt.getTime() / 1000),
      jti: this.generateTokenId(),
    };

    const accessToken = await this.nestJwtService.signAsync(accessTokenPayload);

    return {
      accessToken,
      accessTokenExpiresAt,
    };
  }

  /**
   * Verifica y decodifica un token JWT
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (error) {
      throw new Error(
        `Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decodifica un token JWT sin verificar la firma (útil para debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.nestJwtService.decode(token) as JwtPayload;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Genera un ID único para el token
   */
  private generateTokenId(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
  isTokenNearExpiration(payload: JwtPayload, thresholdMinutes: number = 5): boolean {
    const now = Math.floor(Date.now() / 1000);
    const thresholdSeconds = thresholdMinutes * 60;
    return payload.exp - now <= thresholdSeconds;
  }
}
