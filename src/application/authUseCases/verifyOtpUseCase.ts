import { Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOtpRepository } from '@auth/domain/repositories';

export interface IVerifyOtpRequest {
  email: string;
  otpCode: string;
  orgId: string;
}

export interface IOtpVerificationData {
  isValid: boolean;
  email: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
}

export type IVerifyOtpResponse = IApiResponseSuccess<IOtpVerificationData>;

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
          success: true,
          message: 'Invalid or expired verification code.',
          data: {
            isValid: false,
            email: request.email,
          },
          timestamp: new Date().toISOString(),
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
          data: {
            isValid: true,
            email: request.email,
            expiresAt: otp.expiresAt,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        const attemptsRemaining = otp.maxAttempts - otp.attempts;

        if (otp.hasExceededMaxAttempts()) {
          this.logger.warn(`OTP max attempts exceeded for email: ${request.email}`);
          return {
            success: true,
            message: 'Maximum number of attempts exceeded. Request a new code.',
            data: {
              isValid: false,
              email: request.email,
              attemptsRemaining: 0,
            },
            timestamp: new Date().toISOString(),
          };
        }

        this.logger.warn(
          `OTP verification failed for email: ${request.email}, attempts: ${otp.attempts}`
        );
        return {
          success: true,
          message: `Incorrect code. Attempts remaining: ${attemptsRemaining}`,
          data: {
            isValid: false,
            email: request.email,
            attemptsRemaining,
          },
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error('Verify OTP use case failed:', error);
      throw new Error('Error verifying OTP code');
    }
  }
}
