import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { IOtpRepository, IUserRepository } from '@auth/domain/repositories';

export interface IResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
  orgId: string;
}

export interface IResetPasswordResponse {
  success: boolean;
  message: string;
  email: string;
}

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('OtpRepository') private readonly otpRepository: IOtpRepository
  ) {}

  async execute(request: IResetPasswordRequest): Promise<IResetPasswordResponse> {
    try {
      // Validar que las contraseñas coincidan
      if (request.newPassword !== request.confirmPassword) {
        throw new UnauthorizedException('Passwords do not match');
      }

      // Validar la fortaleza de la nueva contraseña
      const passwordValidation = AuthenticationService.validatePasswordStrength(
        request.newPassword
      );
      if (!passwordValidation.isValid) {
        throw new UnauthorizedException(
          `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`
        );
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email, request.orgId);
      if (!user) {
        this.logger.warn(`Password reset attempt with non-existent email: ${request.email}`);
        throw new UnauthorizedException('User not found');
      }

      // Verificar que el usuario esté activo
      if (!user.canLogin()) {
        this.logger.warn(`Password reset attempt for locked/inactive user: ${user.id}`);
        throw new UnauthorizedException('Account is locked or inactive');
      }

      // Buscar OTP válido
      const otp = await this.otpRepository.findValidByEmailAndType(
        request.email,
        'PASSWORD_RESET',
        request.orgId
      );

      if (!otp) {
        this.logger.warn(
          `Password reset attempt with invalid/expired OTP for email: ${request.email}`
        );
        throw new UnauthorizedException('Invalid or expired verification code');
      }

      // Verificar el código OTP
      const isValidOtp = otp.verify(request.otpCode);
      if (!isValidOtp) {
        await this.otpRepository.save(otp); // Guardar el intento fallido

        if (otp.hasExceededMaxAttempts()) {
          throw new UnauthorizedException(
            'Maximum number of attempts exceeded. Request a new code.'
          );
        }

        const attemptsRemaining = otp.maxAttempts - otp.attempts;
        throw new UnauthorizedException(`Incorrect code. Attempts remaining: ${attemptsRemaining}`);
      }

      // Verificar que la nueva contraseña sea diferente a la actual
      const isSamePassword = await AuthenticationService.verifyPassword(
        request.newPassword,
        user.passwordHash
      );

      if (isSamePassword) {
        throw new UnauthorizedException('New password must be different from current password');
      }

      // Cambiar la contraseña del usuario
      user.changePassword(request.newPassword);
      await this.userRepository.save(user);

      // Marcar OTP como usado y guardar
      otp.markAsUsed();
      await this.otpRepository.save(otp);

      this.logger.log(`Password reset completed successfully for user: ${user.id}`);

      return {
        success: true,
        message: 'Password updated successfully. You can now log in with your new password.',
        email: request.email,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Reset password use case failed:', error);
      throw new Error('Error resetting password');
    }
  }
}
