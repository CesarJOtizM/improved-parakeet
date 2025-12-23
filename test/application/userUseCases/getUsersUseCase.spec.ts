/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetUsersUseCase } from '@application/userUseCases/getUsersUseCase';
import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('GetUsersUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetUsersUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      countByStatus: jest.fn(),
      save: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new GetUsersUseCase(mockUserRepository);
  });

  describe('execute', () => {
    const createMockUsers = (count: number) => {
      return Array.from({ length: count }, (_, i) => {
        const user = User.reconstitute(
          {
            email: Email.create(`user${i}@example.com`),
            username: `user${i}`,
            passwordHash: User.create(
              {
                email: Email.create(`user${i}@example.com`),
                username: `user${i}`,
                password: 'SecurePass123!',
                firstName: `First${i}`,
                lastName: `Last${i}`,
                status: UserStatus.create('ACTIVE'),
                failedLoginAttempts: 0,
              },
              mockOrgId
            ).passwordHash as any,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            status: UserStatus.create('ACTIVE'),
            failedLoginAttempts: 0,
          },
          `user-${i}`,
          mockOrgId
        );

        (user as any).props.roles = ['ADMIN'];
        return user;
      });
    };

    it('Given: users exist When: getting users Then: should return paginated list', async () => {
      // Arrange
      const users = createMockUsers(15);
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('Given: users exist When: getting second page Then: should return correct page', async () => {
      // Arrange
      const users = createMockUsers(15);
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('Given: status filter When: getting users Then: should filter by status', async () => {
      // Arrange
      const activeUsers = createMockUsers(5);
      mockUserRepository.findByStatus.mockResolvedValue(activeUsers);

      const request = {
        orgId: mockOrgId,
        status: 'ACTIVE',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUserRepository.findByStatus).toHaveBeenCalledWith('ACTIVE', mockOrgId);
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
    });

    it('Given: search term When: getting users Then: should filter by search', async () => {
      // Arrange
      const users = createMockUsers(10);
      users[0].update({ firstName: 'John' });
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        search: 'John',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some(u => u.firstName.includes('John'))).toBe(true);
    });

    it('Given: no users When: getting users Then: should return empty list', async () => {
      // Arrange
      mockUserRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('Given: default pagination When: getting users Then: should use defaults', async () => {
      // Arrange
      const users = createMockUsers(5);
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });
});
