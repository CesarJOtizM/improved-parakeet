import { Inject, Injectable, Logger } from '@nestjs/common';

import type { IOtpRepository } from '@auth/domain/repositories';

export interface IVerifyOtpRequest {
  email: string;
  otpCode: string;
  orgId: string;
}

export interface IVerifyOtpResponse {
  success: boolean;
  message: string;
  isValid: boolean;
  email: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
}

@Injectable()
export class VerifyOtpUseCase {
  private readonly logger = new Logger(VerifyOtpUseCase.name);

  constructor(@Inject('OtpRepository') private readonly otpRepository: IOtpRepository) {}

  async execute(request: IVerifyOtpRequest): Promise<IVerifyOtpResponse> {
    try {
      // Buscar OTP válido por email y tipo
      const otp = await this.otpRepository.findValidByEmailAndType(
        request.email,
        'PASSWORD_RESET',
        request.orgId
      );

      if (!otp) {
        this.logger.warn(
          `OTP verification attempt with invalid/expired OTP for email: ${request.email}`
        );
        return {
          success: false,
          message: 'Invalid or expired verification code.',
          isValid: false,
          email: request.email,
        };
      }

      // Verificar el código OTP
      const isValid = otp.verify(request.otpCode);

      // Guardar cambios en el OTP (intentos, estado usado, etc.)
      await this.otpRepository.save(otp);

      if (isValid) {
        this.logger.log(`OTP verified successfully for email: ${request.email}`);
        return {
          success: true,
          message: 'Valid verification code.',
          isValid: true,
          email: request.email,
          expiresAt: otp.expiresAt,
        };
      } else {
        const attemptsRemaining = otp.maxAttempts - otp.attempts;

        if (otp.hasExceededMaxAttempts()) {
          this.logger.warn(`OTP max attempts exceeded for email: ${request.email}`);
          return {
            success: false,
            message: 'Maximum number of attempts exceeded. Request a new code.',
            isValid: false,
            email: request.email,
            attemptsRemaining: 0,
          };
        }

        this.logger.warn(
          `OTP verification failed for email: ${request.email}, attempts: ${otp.attempts}`
        );
        return {
          success: false,
          message: `Incorrect code. Attempts remaining: ${attemptsRemaining}`,
          isValid: false,
          email: request.email,
          attemptsRemaining,
        };
      }
    } catch (error) {
      this.logger.error('Verify OTP use case failed:', error);
      throw new Error('Error verifying OTP code');
    }
  }
}
