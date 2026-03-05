import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUTH_PASSWORD_CHANGE_FAILED,
  AUTH_PASSWORD_INCORRECT,
  AUTH_PASSWORD_REQUIREMENTS,
  AUTH_PASSWORD_SAME_AS_CURRENT,
  AUTH_PASSWORDS_MISMATCH,
  AUTH_USER_NOT_FOUND,
} from '@shared/constants/error-codes';
import { DomainError, err, ok, Result, ValidationError } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface IChangePasswordRequest {
  userId: string;
  orgId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IChangePasswordData {
  userId: string;
}

export type IChangePasswordResponse = IApiResponseSuccess<IChangePasswordData>;

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(
    request: IChangePasswordRequest
  ): Promise<Result<IChangePasswordResponse, DomainError>> {
    try {
      // Validate passwords match
      if (request.newPassword !== request.confirmPassword) {
        return err(new ValidationError('Passwords do not match', AUTH_PASSWORDS_MISMATCH));
      }

      // Validate password strength
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

      // Find user
      const user = await this.userRepository.findById(request.userId, request.orgId);
      if (!user) {
        return err(new ValidationError('User not found', AUTH_USER_NOT_FOUND));
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthenticationService.verifyPassword(
        request.currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        return err(new ValidationError('Current password is incorrect', AUTH_PASSWORD_INCORRECT));
      }

      // Ensure new password is different from current
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

      // Hash and change password
      const hashedPassword = await AuthenticationService.hashPassword(request.newPassword);
      user.changePasswordHashed(hashedPassword);
      await this.userRepository.save(user);

      this.logger.log(`Password changed successfully for user: ${user.id}`);

      return ok({
        success: true,
        message: 'Password changed successfully',
        data: { userId: user.id },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Change password failed:', error);
      return err(new ValidationError('Failed to change password', AUTH_PASSWORD_CHANGE_FAILED));
    }
  }
}
