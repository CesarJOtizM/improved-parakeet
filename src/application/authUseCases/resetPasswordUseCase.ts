import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUTH_PASSWORD_REQUIREMENTS,
  AUTH_PASSWORD_SAME_AS_CURRENT,
  AUTH_PASSWORDS_MISMATCH,
} from '@shared/constants/error-codes';
import { DomainError, err, ok, Result, TokenError, ValidationError } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOtpRepository, IUserRepository } from '@auth/domain/repositories';

export interface IResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
  orgId: string;
}

export interface IResetPasswordData {
  email: string;
}

export type IResetPasswordResponse = IApiResponseSuccess<IResetPasswordData>;

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('OtpRepository') private readonly otpRepository: IOtpRepository
  ) {}

  async execute(
    request: IResetPasswordRequest
  ): Promise<Result<IResetPasswordResponse, DomainError>> {
    try {
      // Validar que las contraseñas coincidan
      if (request.newPassword !== request.confirmPassword) {
        return err(new ValidationError('Passwords do not match', AUTH_PASSWORDS_MISMATCH));
      }

      // Validar la fortaleza de la nueva contraseña
      const passwordValidation = AuthenticationService.validatePasswordStrength(
        request.newPassword
      );
      if (!passwordValidation.isValid) {
        return err(
          new ValidationError(
            `Password does not meet security requirements: ${passwordValidation.errors.join(', ')}`,
            AUTH_PASSWORD_REQUIREMENTS
          )
        );
      }

      // Buscar usuario por email
      const user = await this.userRepository.findByEmail(request.email, request.orgId);
      if (!user) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Password reset attempt with non-existent email: ${request.email}`);
        return err(new TokenError('user_not_found'));
      }

      // Verificar que el usuario esté activo
      if (!user.canLogin()) {
        // SECURITY: Log details but return generic error
        this.logger.warn(`Password reset attempt for locked/inactive user: ${user.id}`);
        return err(new TokenError('account_locked'));
      }

      // Buscar OTP válido
      const otp = await this.otpRepository.findValidByEmailAndType(
        request.email,
        'PASSWORD_RESET',
        request.orgId
      );

      if (!otp) {
        // SECURITY: Log details but return generic error
        this.logger.warn(
          `Password reset attempt with invalid/expired OTP for email: ${request.email}`
        );
        return err(new TokenError('invalid_or_expired_otp'));
      }

      // Verificar el código OTP
      const isValidOtp = otp.verify(request.otpCode);
      if (!isValidOtp) {
        await this.otpRepository.save(otp); // Guardar el intento fallido

        if (otp.hasExceededMaxAttempts()) {
          // SECURITY: Log details but return generic error
          return err(new TokenError('max_attempts_exceeded'));
        }

        // SECURITY: Log details but return generic error
        return err(new TokenError('invalid_otp_code'));
      }

      // Verificar que la nueva contraseña sea diferente a la actual
      const isSamePassword = await AuthenticationService.verifyPassword(
        request.newPassword,
        user.passwordHash
      );

      if (isSamePassword) {
        return err(
          new ValidationError(
            'New password must be different from current password',
            AUTH_PASSWORD_SAME_AS_CURRENT
          )
        );
      }

      // Cambiar la contraseña del usuario
      const hashedPassword = await AuthenticationService.hashPassword(request.newPassword);
      user.changePasswordHashed(hashedPassword);
      await this.userRepository.save(user);

      // Marcar OTP como usado y guardar
      otp.markAsUsed();
      await this.otpRepository.save(otp);

      this.logger.log(`Password reset completed successfully for user: ${user.id}`);

      return ok({
        success: true,
        message: 'Password updated successfully. You can now log in with your new password.',
        data: {
          email: request.email,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // SECURITY: Log full error but return generic message
      this.logger.error('Reset password use case failed:', error);
      return err(new TokenError('internal_error'));
    }
  }
}
