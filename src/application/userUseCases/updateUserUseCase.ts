import { UserManagementService } from '@auth/domain/services/userManagementService';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_NOT_FOUND, USER_VALIDATION_FAILED } from '@shared/constants/error-codes';
import {
  ConflictError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface IUpdateUserRequest {
  userId: string;
  orgId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  jobTitle?: string;
  department?: string;
  updatedBy: string;
}

export interface IUpdateUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  timezone?: string;
  language?: string;
  jobTitle?: string;
  department?: string;
  status: string;
  orgId: string;
  updatedAt: Date;
}

export type IUpdateUserResponse = IApiResponseSuccess<IUpdateUserData>;

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IUpdateUserRequest): Promise<Result<IUpdateUserResponse, DomainError>> {
    this.logger.log('Updating user', { userId: request.userId, orgId: request.orgId });

    // Get existing user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      return err(new NotFoundError('User not found', USER_NOT_FOUND));
    }

    // Validate update data
    const validation = UserManagementService.validateUserUpdate({
      firstName: request.firstName,
      lastName: request.lastName,
      username: request.username,
      email: request.email,
    });

    if (!validation.isValid) {
      return err(
        new ValidationError(
          `Validation failed: ${validation.errors.join(', ')}`,
          USER_VALIDATION_FAILED
        )
      );
    }

    // Check email uniqueness if email is being changed
    if (request.email && request.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailValidation = await UserManagementService.canChangeEmail(
        user,
        request.email,
        async (email, orgId) => this.userRepository.existsByEmail(email, orgId)
      );
      if (!emailValidation.isValid) {
        return err(
          new ConflictError(`Email validation failed: ${emailValidation.errors.join(', ')}`)
        );
      }
    }

    // Check username uniqueness if username is being changed
    if (request.username && request.username.toLowerCase() !== user.username.toLowerCase()) {
      const usernameValidation = await UserManagementService.canChangeUsername(
        user,
        request.username,
        async (username, orgId) => this.userRepository.existsByUsername(username, orgId)
      );
      if (!usernameValidation.isValid) {
        return err(
          new ConflictError(`Username validation failed: ${usernameValidation.errors.join(', ')}`)
        );
      }
    }

    // Update user
    user.update({
      firstName: request.firstName,
      lastName: request.lastName,
      username: request.username,
      email: request.email,
      phone: request.phone,
      timezone: request.timezone,
      language: request.language,
      jobTitle: request.jobTitle,
      department: request.department,
    });

    // Save updated user
    const updatedUser = await this.userRepository.save(user);

    this.logger.log('User updated successfully', { userId: updatedUser.id });

    return ok({
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone,
        language: updatedUser.language,
        jobTitle: updatedUser.jobTitle,
        department: updatedUser.department,
        status: updatedUser.status.getValue(),
        orgId: updatedUser.orgId,
        updatedAt: updatedUser.updatedAt,
      } as IUpdateUserData,
      timestamp: new Date().toISOString(),
    });
  }
}
