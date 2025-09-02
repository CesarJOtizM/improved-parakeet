import { Otp } from '@auth/domain/entities/otp.entity';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { EmailService } from '@infrastructure/externalServices';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOtpRepository, IUserRepository } from '@auth/domain/repositories';

export interface IRequestPasswordResetRequest {
  email: string;
  orgId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRequestPasswordResetData {
  email: string;
  expiresAt: Date;
}

export type IRequestPasswordResetResponse = IApiResponseSuccess<IRequestPasswordResetData>;

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('OtpRepository') private readonly otpRepository: IOtpRepository,
    private readonly emailService: EmailService,
    private readonly rateLimitService: RateLimitService
  ) {}

  async execute(request: IRequestPasswordResetRequest): Promise<IRequestPasswordResetResponse> {
    try {
      // Verificar rate limiting para solicitudes de recuperación
      const rateLimitResult = await this.rateLimitService.checkPasswordResetRateLimit(
        request.ipAddress || 'unknown'
      );

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Password reset rate limit exceeded for IP: ${request.ipAddress}`);
        throw new HttpException(
          'Too many password reset requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email, request.orgId);
      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        this.logger.warn(`Password reset attempt with non-existent email: ${request.email}`);
        return {
          success: true,
          message: 'If the email exists in our system, you will receive a verification code.',
          data: {
            email: request.email,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Verificar que el usuario esté activo
      if (!user.canLogin()) {
        this.logger.warn(`Password reset attempt for locked/inactive user: ${user.id}`);
        return {
          success: true,
          message: 'If the email exists in our system, you will receive a verification code.',
          data: {
            email: request.email,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Verificar si ya existe un OTP válido reciente
      const recentOtp = await this.otpRepository.findRecentOtpByEmail(
        request.email,
        request.orgId,
        1 // Última hora
      );

      const validRecentOtp = recentOtp.find(otp => otp.type === 'PASSWORD_RESET' && otp.isValid());
      if (validRecentOtp) {
        this.logger.warn(`Password reset attempt with existing valid OTP for user: ${user.id}`);
        return {
          success: true,
          message:
            'A verification code has already been sent. Check your email or wait before requesting a new one.',
          data: {
            email: request.email,
            expiresAt: validRecentOtp.expiresAt,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Crear nuevo OTP
      const otp = Otp.create(
        request.email,
        'PASSWORD_RESET',
        request.orgId,
        request.ipAddress,
        request.userAgent,
        15 // 15 minutos de expiración
      );

      await this.otpRepository.save(otp);

      // Enviar email con OTP
      const emailResult = await this.emailService.sendPasswordResetOtpEmail(
        user.email,
        user.firstName,
        user.lastName,
        otp.code,
        request.orgId,
        15
      );

      if (!emailResult.success) {
        this.logger.error(`Failed to send password reset email to user: ${user.id}`, {
          error: emailResult.error,
        });
        throw new Error('Error sending recovery email');
      }

      this.logger.log(`Password reset OTP sent successfully to user: ${user.id}`);

      return {
        success: true,
        message: 'A verification code has been sent to your email.',
        data: {
          email: request.email,
          expiresAt: otp.expiresAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }

      this.logger.error('Request password reset use case failed:', error);
      throw new Error('Error processing password reset request');
    }
  }
}
