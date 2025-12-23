/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetUserUseCase } from '@application/userUseCases/getUserUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

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
    it('Given: existing user When: getting user Then: should return user data', async () => {
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
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockUserId);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.roles).toEqual(['ADMIN']);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });

    it('Given: non-existent user When: getting user Then: should throw NotFoundException', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ userId: mockUserId, orgId: mockOrgId })).rejects.toThrow(
        NotFoundException
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
    });
  });
});
