/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetUserUseCase } from '@application/userUseCases/getUserUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '@shared/domain/result/domainError';

describe('GetUserUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';

  let useCase: GetUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      countByStatus: jest.fn(),
      findLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      save: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new GetUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('Given: existing user When: getting user Then: should return success result with user data', async () => {
      // Arrange
      const mockUser = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: User.create(
            {
              email: Email.create('test@example.com'),
              username: 'testuser',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
          roles: ['ADMIN'],
          permissions: ['USERS:CREATE', 'USERS:READ'],
        },
        mockUserId,
        mockOrgId
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute({ userId: mockUserId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.id).toBe(mockUserId);
          expect(value.data.email).toBe('test@example.com');
          expect(value.data.roles).toEqual(['ADMIN']);
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });

    it('Given: non-existent user When: getting user Then: should return NotFoundError result', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({ userId: mockUserId, orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('User not found');
        }
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });
  });
});
