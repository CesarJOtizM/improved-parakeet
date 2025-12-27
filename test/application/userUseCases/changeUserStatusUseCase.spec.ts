/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeUserStatusUseCase } from '@application/userUseCases/changeUserStatusUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

describe('ChangeUserStatusUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';
  const mockChangedBy = 'admin-456';

  let useCase: ChangeUserStatusUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventDispatcher: jest.Mocked<DomainEventDispatcher>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn(),
      markAndDispatch: jest.fn(),
    } as any;
    mockEventDispatcher.dispatchEvents.mockResolvedValue(undefined);
    mockEventDispatcher.markAndDispatch.mockResolvedValue(undefined);

    useCase = new ChangeUserStatusUseCase(
      mockUserRepository,
      mockPrismaService,
      mockEventDispatcher
    );
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

    it('Given: active user When: changing to inactive Then: should return success result', async () => {
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('INACTIVE');
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('Given: inactive user When: changing to active Then: should return success result', async () => {
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('ACTIVE');
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: active user When: locking user Then: should return success result', async () => {
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('LOCKED');
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('Given: non-existent user When: changing status Then: should return NotFoundError result', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INACTIVE' as const,
        changedBy: mockChangedBy,
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
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('Given: user trying to deactivate themselves When: changing status Then: should return BusinessRuleError result', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INACTIVE' as const,
        changedBy: mockUserId, // User trying to deactivate themselves
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: invalid status When: changing status Then: should return ValidationError result', async () => {
      // Arrange
      const user = createMockUser('ACTIVE');
      mockUserRepository.findById.mockResolvedValue(user);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'INVALID' as any,
        changedBy: mockChangedBy,
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
  });
});
