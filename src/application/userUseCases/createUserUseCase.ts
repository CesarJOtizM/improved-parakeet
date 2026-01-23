import { User } from '@auth/domain/entities/user.entity';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { UserManagementService } from '@auth/domain/services/userManagementService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  err,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface ICreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  orgId: string;
  createdBy: string;
}

export interface ICreateUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateUserResponse = IApiResponseSuccess<ICreateUserData>;

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: ICreateUserRequest): Promise<Result<ICreateUserResponse, DomainError>> {
    this.logger.log('Creating user', { email: request.email, orgId: request.orgId });

    // Validate user creation data
    const validation = UserManagementService.validateUserCreation({
      email: request.email,
      username: request.username,
      firstName: request.firstName,
      lastName: request.lastName,
      password: request.password,
    });

    if (!validation.isValid) {
      return err(new ValidationError(`Validation failed: ${validation.errors.join(', ')}`));
    }

    // Check if email already exists
    const emailExists = await this.userRepository.existsByEmail(request.email, request.orgId);
    if (emailExists) {
      return err(new ConflictError('Email is already in use'));
    }

    // Check if username already exists
    const usernameExists = await this.userRepository.existsByUsername(
      request.username,
      request.orgId
    );
    if (usernameExists) {
      return err(new ConflictError('Username is already in use'));
    }

    // Hash the password before creating the user
    const hashedPassword = await AuthenticationService.hashPassword(request.password);

    // Create user entity with hashed password
    const user = User.create(
      {
        email: Email.create(request.email),
        username: request.username,
        password: hashedPassword,
        isPasswordHashed: true,
        firstName: request.firstName,
        lastName: request.lastName,
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
      },
      request.orgId
    );

    // Save user
    const savedUser = await this.userRepository.save(user);

    this.logger.log('User created successfully', { userId: savedUser.id, email: savedUser.email });

    // Publish domain events (handled by repository or event dispatcher)
    // Domain events are automatically collected and can be dispatched

    return ok({
      success: true,
      message: 'User created successfully',
      data: {
        id: savedUser.id,
        email: savedUser.email,
        username: savedUser.username,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        status: savedUser.status.getValue(),
        orgId: savedUser.orgId,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      } as ICreateUserData,
      timestamp: new Date().toISOString(),
    });
  }
}
