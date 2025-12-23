import { UserManagementService } from '@auth/domain/services/userManagementService';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface IUpdateUserRequest {
  userId: string;
  orgId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  updatedBy: string;
}

export interface IUpdateUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  orgId: string;
  updatedAt: Date;
}

export type IUpdateUserResponse = IApiResponseSuccess<IUpdateUserData>;

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IUpdateUserRequest): Promise<IUpdateUserResponse> {
    this.logger.log('Updating user', { userId: request.userId, orgId: request.orgId });

    // Get existing user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate update data
    const validation = UserManagementService.validateUserUpdate({
      firstName: request.firstName,
      lastName: request.lastName,
      username: request.username,
      email: request.email,
    });

    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check email uniqueness if email is being changed
    if (request.email && request.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailValidation = await UserManagementService.canChangeEmail(
        user,
        request.email,
        async (email, orgId) => this.userRepository.existsByEmail(email, orgId)
      );
      if (!emailValidation.isValid) {
        throw new ConflictException(
          `Email validation failed: ${emailValidation.errors.join(', ')}`
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
        throw new ConflictException(
          `Username validation failed: ${usernameValidation.errors.join(', ')}`
        );
      }
    }

    // Update user
    user.update({
      firstName: request.firstName,
      lastName: request.lastName,
      username: request.username,
      email: request.email,
    });

    // Save updated user
    const updatedUser = await this.userRepository.save(user);

    this.logger.log('User updated successfully', { userId: updatedUser.id });

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        status: updatedUser.status.getValue(),
        orgId: updatedUser.orgId,
        updatedAt: updatedUser.updatedAt,
      } as IUpdateUserData,
      timestamp: new Date().toISOString(),
    };
  }
}
