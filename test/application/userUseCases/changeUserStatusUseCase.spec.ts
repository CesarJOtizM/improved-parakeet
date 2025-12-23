/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeUserStatusUseCase } from '@application/userUseCases/changeUserStatusUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChangeUserStatusUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';
  const mockChangedBy = 'admin-456';

  let useCase: ChangeUserStatusUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      countByStatus: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockPrismaService = {
      user: {
        update: jest.fn(),
      } as any,
    } as jest.Mocked<PrismaService>;

    useCase = new ChangeUserStatusUseCase(mockUserRepository, mockPrismaService);
  });

  describe('execute', () => {
    const createMockUser = (status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' = 'ACTIVE') => {
      return User.reconstitute(
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
              status: UserStatus.create(status),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create(status),
          failedLoginAttempts: 0,
        },
        mockUserId,
        mockOrgId
      );
    };

    it('Given: active user When: changing to inactive Then: should change status successfully', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({} as any);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INACTIVE' as const,
        changedBy: mockChangedBy,
        reason: 'User requested deactivation',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('INACTIVE');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('Given: inactive user When: changing to active Then: should change status successfully', async () => {
      // Arrange
      const user = createMockUser('INACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({} as any);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'ACTIVE' as const,
        changedBy: mockChangedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('ACTIVE');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: active user When: locking user Then: should lock successfully', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({} as any);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'LOCKED' as const,
        changedBy: mockChangedBy,
        reason: 'Too many failed login attempts',
        lockDurationMinutes: 30,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('LOCKED');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: non-existent user When: changing status Then: should throw NotFoundException', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INACTIVE' as const,
        changedBy: mockChangedBy,
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('Given: user trying to deactivate themselves When: changing status Then: should throw BadRequestException', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INACTIVE' as const,
        changedBy: mockUserId, // User trying to deactivate themselves
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    });

    it('Given: invalid status When: changing status Then: should throw BadRequestException', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INVALID' as any,
        changedBy: mockChangedBy,
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(BadRequestException);
    });
  });
});
