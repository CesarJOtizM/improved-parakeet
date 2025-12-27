/* eslint-disable @typescript-eslint/no-explicit-any */
import { UpdateUserUseCase } from '@application/userUseCases/updateUserUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('UpdateUserUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';
  const mockUpdatedBy = 'admin-456';

  let useCase: UpdateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      save: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      countByStatus: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new UpdateUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    const createMockUser = () => {
      return User.reconstitute(
        {
          email: Email.create('old@example.com'),
          username: 'oldusername',
          passwordHash: User.create(
            {
              email: Email.create('old@example.com'),
              username: 'oldusername',
              password: 'SecurePass123!',
              firstName: 'Old',
              lastName: 'Name',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Old',
          lastName: 'Name',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockUserId,
        mockOrgId
      );
    };

    it('Given: valid update data When: updating user Then: should return success result', async () => {
      // Arrange
      const user = createMockUser();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        firstName: 'New',
        lastName: 'Name',
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('User updated successfully');
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: non-existent user When: updating user Then: should return NotFoundError result', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        firstName: 'New',
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('User not found');
        }
      );
    });

    it('Given: invalid email When: updating user Then: should return ValidationError result', async () => {
      // Arrange
      const user = createMockUser();
      mockUserRepository.findById.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        email: 'invalid-email',
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });

    it('Given: email already in use When: updating user Then: should return ConflictError result', async () => {
      // Arrange
      const user = createMockUser();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        email: 'taken@example.com',
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('Email is already in use');
        }
      );
    });

    it('Given: username already in use When: updating user Then: should return ConflictError result', async () => {
      // Arrange
      const user = createMockUser();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.existsByUsername.mockResolvedValue(true);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        username: 'takenusername',
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('Username is already in use');
        }
      );
    });
  });
});
