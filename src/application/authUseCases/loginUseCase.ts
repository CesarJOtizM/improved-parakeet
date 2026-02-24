import { Session } from '@auth/domain/entities/session.entity';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { JwtService } from '@auth/domain/services/jwtService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AuthenticationError,
  DomainError,
  RateLimitError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
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
    private readonly rateLimitService: RateLimitService
  ) {}

  async execute(request: ILoginRequest): Promise<Result<ILoginResponse, DomainError>> {
    try {
      // Verificar rate limiting para login
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        request.ipAddress || 'unknown',
        'LOGIN'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Login rate limit exceeded for IP: ${request.ipAddress}`);
        return err(new RateLimitError('Too many login attempts. Please try again later.'));
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email, request.orgId);
      if (!user) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Login attempt with non-existent email: ${request.email}`);
        return err(new AuthenticationError('user_not_found'));
      }

      // Verificar que el usuario pueda hacer login
      if (!user.canLogin()) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Login attempt for locked/inactive user: ${user.id}`);
        return err(new AuthenticationError('account_locked_or_inactive'));
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

        // SECURITY: Log details but return generic error
        this.logger.warn(`Failed login attempt for user: ${user.id}`);
        return err(new AuthenticationError('invalid_password'));
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

      this.logger.log(`Successful login for user: ${user.id}`);

      return ok({
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
      });
    } catch (error) {
      // SECURITY: Log full error but return generic message
      this.logger.error('Login use case failed:', error);
      return err(new AuthenticationError('internal_error'));
    }
  }
}
