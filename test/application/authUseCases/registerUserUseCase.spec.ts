import { RegisterUserUseCase } from '@application/authUseCases/registerUserUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { EmailService } from '@infrastructure/externalServices/emailService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IUserRepository } from '@auth/domain/repositories';
import type { IOrganizationRepository } from '@organization/domain/repositories';

describe('RegisterUserUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockOrgSlug = 'test-org';

  let useCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findLockedUsers: jest.fn(),
      countByStatus: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockOrganizationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockEmailService = {
      sendWelcomeEmail: jest.fn(),
      sendNewUserNotificationToAdmin: jest.fn(),
      sendPasswordResetOtpEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    useCase = new RegisterUserUseCase(
      mockUserRepository,
      mockOrganizationRepository,
      mockEmailService
    );
  });

  describe('execute', () => {
    const validRequest = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      organizationSlug: mockOrgSlug,
    };

    it('Given: valid user data When: registering user Then: should return success result', async () => {
      // Arrange
      const mockOrganization = Organization.reconstitute(
        {
          name: 'Test Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        mockOrgId,
        mockOrgSlug
      );
      Object.defineProperty(mockOrganization, 'isActive', {
        get: () => true,
        configurable: true,
      });
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      const mockUser = User.create(
        {
          email: Email.create(validRequest.email),
          username: validRequest.username,
          password: validRequest.password,
          firstName: validRequest.firstName,
          lastName: validRequest.lastName,
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockEmailService.sendWelcomeEmail.mockResolvedValue({ success: true });
      mockUserRepository.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.email).toBe(validRequest.email);
          expect(value.requiresAdminActivation).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: missing organization When: registering user Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        organizationSlug: undefined,
        organizationId: undefined,
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('organizationSlug or organizationId');
        }
      );
    });

    it('Given: non-existent organization When: registering user Then: should return NotFoundError', async () => {
      // Arrange
      mockOrganizationRepository.findBySlug.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Organization not found');
        }
      );
    });

    it('Given: inactive organization When: registering user Then: should return ValidationError', async () => {
      // Arrange
      const inactiveOrg = Organization.reconstitute(
        {
          name: 'Inactive Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: false,
        },
        mockOrgId,
        mockOrgSlug
      );
      Object.defineProperty(inactiveOrg, 'isActive', {
        get: () => false,
        configurable: true,
      });
      mockOrganizationRepository.findBySlug.mockResolvedValue(inactiveOrg);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('not active');
        }
      );
    });

    it('Given: duplicate email When: registering user Then: should return ConflictError', async () => {
      // Arrange
      const mockOrganization = Organization.reconstitute(
        {
          name: 'Test Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        mockOrgId,
        mockOrgSlug
      );
      Object.defineProperty(mockOrganization, 'isActive', {
        get: () => true,
        configurable: true,
      });
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);
      const existingUser = User.create(
        {
          email: Email.create(validRequest.email),
          username: 'otheruser',
          password: 'SecurePass123!',
          firstName: 'Other',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists');
        }
      );
    });

    it('Given: weak password When: registering user Then: should return ValidationError', async () => {
      // Arrange
      const mockOrganization = Organization.reconstitute(
        {
          name: 'Test Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        mockOrgId,
        mockOrgSlug
      );
      Object.defineProperty(mockOrganization, 'isActive', {
        get: () => true,
        configurable: true,
      });
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const invalidRequest = {
        ...validRequest,
        password: 'weak',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Invalid password');
        }
      );
    });
  });
});
