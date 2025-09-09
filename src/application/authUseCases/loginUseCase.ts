import { Session } from '@auth/domain/entities/session.entity';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISessionRepository, IUserRepository } from '@auth/domain/repositories';

export interface ILoginRequest {
  email: string;
  password: string;
  orgId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ILoginData {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  sessionId: string;
}

export type ILoginResponse = IApiResponseSuccess<ILoginData>;

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('SessionRepository') private readonly sessionRepository: ISessionRepository,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly rateLimitService: RateLimitService
  ) {}

  async execute(request: ILoginRequest): Promise<ILoginResponse> {
    try {
      // Verificar rate limiting para login
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        request.ipAddress || 'unknown',
        'LOGIN'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Login rate limit exceeded for IP: ${request.ipAddress}`);
        throw new UnauthorizedException('Too many login attempts. Please try again later.');
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email, request.orgId);
      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${request.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verificar que el usuario pueda hacer login
      if (!user.canLogin()) {
        this.logger.warn(`Login attempt for locked/inactive user: ${user.id}`);
        throw new UnauthorizedException('Account is locked or inactive');
      }

      // Verificar contraseña
      const isValidPassword = await AuthenticationService.validateLoginCredentials(
        user,
        request.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        // Procesar login fallido
        AuthenticationService.processFailedLogin(user);
        await this.userRepository.save(user);

        this.logger.warn(`Failed login attempt for user: ${user.id}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Procesar login exitoso
      AuthenticationService.processSuccessfulLogin(user, request.ipAddress, request.userAgent);
      await this.userRepository.save(user);

      // Generar tokens JWT
      const tokenPair = await this.jwtService.generateTokenPair(
        user.id,
        user.orgId,
        user.email,
        user.username,
        user.roles || [],
        user.permissions || []
      );

      // Crear sesión con refresh token
      const session = Session.create(
        {
          userId: user.id,
          token: tokenPair.refreshToken,
          expiresAt: tokenPair.refreshTokenExpiresAt,
          isActive: true,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
        user.orgId
      );

      await this.sessionRepository.save(session);

      // Extraer JTI del token para blacklisting
      const accessTokenPayload = this.jwtService.decodeToken(tokenPair.accessToken);
      const refreshTokenPayload = this.jwtService.decodeToken(tokenPair.refreshToken);

      if (accessTokenPayload && refreshTokenPayload) {
        // Registrar tokens para tracking (no blacklist aún)
        await this.tokenBlacklistService.blacklistToken(
          accessTokenPayload.jti,
          user.id,
          user.orgId,
          tokenPair.accessTokenExpiresAt,
          'SECURITY'
        );
      }

      this.logger.log(`Successful login for user: ${user.id}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles || [],
            permissions: user.permissions || [],
          },
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt,
          sessionId: session.id,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Login use case failed:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
