/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateUserUseCase } from '@application/userUseCases/createUserUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

describe('CreateUserUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockCreatedBy = 'admin-123';
  const mockUserId = 'user-123';

  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
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
      findLockedUsers: jest.fn(),
      countByStatus: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new CreateUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    const validRequest = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      orgId: mockOrgId,
      createdBy: mockCreatedBy,
    };

    it('Given: valid user data When: creating user Then: should return success result', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockUserRepository.existsByUsername.mockResolvedValue(false);

      const savedUser = User.create(
        {
          email: Email.create(validRequest.email),
          username: validRequest.username,
          password: validRequest.password,
          firstName: validRequest.firstName,
          lastName: validRequest.lastName,
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      // Set ID manually for test using reconstitute to have proper ID
      const userWithId = User.reconstitute(
        {
          email: Email.create(validRequest.email),
          username: validRequest.username,
          passwordHash: savedUser.passwordHash as any,
          firstName: validRequest.firstName,
          lastName: validRequest.lastName,
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockUserId,
        mockOrgId
      );

      mockUserRepository.save.mockResolvedValue(userWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('User created successfully');
          expect(value.data.email).toBe(validRequest.email);
          expect(value.data.username).toBe(validRequest.username);
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(validRequest.email, mockOrgId);
      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith(
        validRequest.username,
        mockOrgId
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: invalid email When: creating user Then: should return ValidationError result', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        email: 'invalid-email',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
      expect(mockUserRepository.existsByEmail).not.toHaveBeenCalled();
    });

    it('Given: email already exists When: creating user Then: should return ConflictError result', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('Email is already in use');
        }
      );
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(validRequest.email, mockOrgId);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('Given: username already exists When: creating user Then: should return ConflictError result', async () => {
      // Arrange
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockUserRepository.existsByUsername.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('Username is already in use');
        }
      );
      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith(
        validRequest.username,
        mockOrgId
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('Given: short password When: creating user Then: should return ValidationError result', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        password: 'short',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });

    it('Given: empty first name When: creating user Then: should return ValidationError result', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        firstName: '',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });
  });
});
