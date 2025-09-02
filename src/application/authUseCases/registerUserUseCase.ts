import { User } from '@auth/domain/entities/user.entity';
import { UserRegisteredEvent } from '@auth/domain/events/userRegistered.event';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { EmailService } from '@infrastructure/externalServices/emailService';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';
import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface IRegisterUserRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationSlug?: string;
  organizationId?: string;
}

export interface IUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  orgId: string;
}

export interface IRegisterUserResponse extends IApiResponseSuccess<IUserData> {
  requiresAdminActivation: boolean;
}

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(request: IRegisterUserRequest): Promise<IRegisterUserResponse> {
    try {
      this.logger.log('Starting user registration', { email: request.email });

      // Validate that organization is provided
      if (!request.organizationSlug && !request.organizationId) {
        throw new BadRequestException('organizationSlug or organizationId must be provided');
      }

      // Buscar organización
      let organization;
      if (request.organizationSlug) {
        organization = await this.organizationRepository.findBySlug(request.organizationSlug);
      } else if (request.organizationId) {
        organization = await this.organizationRepository.findById(request.organizationId);
      }

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (!organization.isActive) {
        throw new BadRequestException('Organization is not active');
      }

      const orgId = organization.id;

      // Validate that email doesn't exist in the organization
      const existingUserByEmail = await this.userRepository.findByEmail(request.email, orgId);
      if (existingUserByEmail) {
        throw new BadRequestException('A user with this email already exists in the organization');
      }

      // Validate that username doesn't exist in the organization
      const existingUserByUsername = await this.userRepository.findByUsername(
        request.username,
        orgId
      );
      if (existingUserByUsername) {
        throw new BadRequestException(
          'A user with this username already exists in the organization'
        );
      }

      // Validate password
      const passwordValidation = AuthenticationService.validatePasswordStrength(request.password);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(`Invalid password: ${passwordValidation.errors.join(', ')}`);
      }

      // Create user with INACTIVE status by default
      const user = User.create(
        {
          email: Email.create(request.email),
          username: request.username,
          password: request.password,
          firstName: request.firstName,
          lastName: request.lastName,
          status: UserStatus.create('INACTIVE'), // Inactive by default, requires admin activation
          failedLoginAttempts: 0,
        },
        orgId
      );

      // Add domain event specific for registration
      user.addDomainEventFromService(
        new UserRegisteredEvent(user, request.organizationSlug, request.organizationId)
      );

      // Save user
      await this.userRepository.save(user);

      this.logger.log('User created successfully', { userId: user.id, email: user.email });

      // Send welcome email to user
      try {
        await this.emailService.sendWelcomeEmail(user.email, user.firstName, user.lastName, orgId);
        this.logger.log('Welcome email sent', { userId: user.id });
      } catch (emailError) {
        this.logger.warn('Error sending welcome email', {
          userId: user.id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
        // Don't fail registration due to email error
      }

      // Send notification to admin (find admin in the organization)
      try {
        const adminUsers = await this.userRepository.findByRole('ADMIN', orgId);
        if (adminUsers.length > 0) {
          const adminEmail = adminUsers[0].email; // Take the first admin found
          await this.emailService.sendNewUserNotificationToAdmin(
            adminEmail,
            user.email,
            user.firstName,
            user.lastName,
            orgId
          );
          this.logger.log('New user notification sent to admin', {
            userId: user.id,
            adminEmail,
          });
        }
      } catch (adminEmailError) {
        this.logger.warn('Error sending notification to admin', {
          userId: user.id,
          error: adminEmailError instanceof Error ? adminEmailError.message : 'Unknown error',
        });
        // Don't fail registration due to email error
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status.getValue(),
          orgId: user.orgId,
        },
        message:
          'User registered successfully. Your account requires activation by the administrator.',
        timestamp: new Date().toISOString(),
        requiresAdminActivation: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error in user registration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: request.email,
      });

      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
