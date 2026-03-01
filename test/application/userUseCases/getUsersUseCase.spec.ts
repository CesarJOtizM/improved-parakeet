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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(10);
          expect(value.pagination.total).toBe(15);
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(5);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.length).toBeGreaterThan(0);
          expect(value.data.some(u => u.firstName.includes('John'))).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
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
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy email When: getting users Then: should sort by email ascending', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('alpha@example.com'),
          username: 'userA',
          passwordHash: User.create(
            {
              email: Email.create('alpha@example.com'),
              username: 'userA',
              password: 'SecurePass123!',
              firstName: 'Zack',
              lastName: 'Zeta',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Zack',
          lastName: 'Zeta',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('charlie@example.com'),
          username: 'userB',
          passwordHash: User.create(
            {
              email: Email.create('charlie@example.com'),
              username: 'userB',
              password: 'SecurePass123!',
              firstName: 'Adam',
              lastName: 'Alpha',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Adam',
          lastName: 'Alpha',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      const userC = User.reconstitute(
        {
          email: Email.create('bravo@example.com'),
          username: 'userC',
          passwordHash: User.create(
            {
              email: Email.create('bravo@example.com'),
              username: 'userC',
              password: 'SecurePass123!',
              firstName: 'Mike',
              lastName: 'Mid',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Mike',
          lastName: 'Mid',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-c',
        mockOrgId
      );
      (userC as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userB, userA, userC]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'email',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].email).toBe('alpha@example.com');
          expect(value.data[1].email).toBe('bravo@example.com');
          expect(value.data[2].email).toBe('charlie@example.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy username When: getting users Then: should sort by username ascending', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('a@example.com'),
          username: 'zulu',
          passwordHash: User.create(
            {
              email: Email.create('a@example.com'),
              username: 'zulu',
              password: 'SecurePass123!',
              firstName: 'A',
              lastName: 'A',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'A',
          lastName: 'A',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('b@example.com'),
          username: 'alpha',
          passwordHash: User.create(
            {
              email: Email.create('b@example.com'),
              username: 'alpha',
              password: 'SecurePass123!',
              firstName: 'B',
              lastName: 'B',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'B',
          lastName: 'B',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userA, userB]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'username',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].username).toBe('alpha');
          expect(value.data[1].username).toBe('zulu');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy firstName When: getting users Then: should sort by firstName ascending', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('a@example.com'),
          username: 'userA',
          passwordHash: User.create(
            {
              email: Email.create('a@example.com'),
              username: 'userA',
              password: 'SecurePass123!',
              firstName: 'Zara',
              lastName: 'Last',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Zara',
          lastName: 'Last',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('b@example.com'),
          username: 'userB',
          passwordHash: User.create(
            {
              email: Email.create('b@example.com'),
              username: 'userB',
              password: 'SecurePass123!',
              firstName: 'Adam',
              lastName: 'Last',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Adam',
          lastName: 'Last',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userA, userB]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'firstName',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].firstName).toBe('Adam');
          expect(value.data[1].firstName).toBe('Zara');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy lastName When: getting users Then: should sort by lastName ascending', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('a@example.com'),
          username: 'userA',
          passwordHash: User.create(
            {
              email: Email.create('a@example.com'),
              username: 'userA',
              password: 'SecurePass123!',
              firstName: 'Same',
              lastName: 'Zorro',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Same',
          lastName: 'Zorro',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('b@example.com'),
          username: 'userB',
          passwordHash: User.create(
            {
              email: Email.create('b@example.com'),
              username: 'userB',
              password: 'SecurePass123!',
              firstName: 'Same',
              lastName: 'Abbot',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Same',
          lastName: 'Abbot',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userA, userB]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'lastName',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].lastName).toBe('Abbot');
          expect(value.data[1].lastName).toBe('Zorro');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy status When: getting users Then: should sort by status value ascending', async () => {
      // Arrange
      const userActive = User.reconstitute(
        {
          email: Email.create('active@example.com'),
          username: 'activeUser',
          passwordHash: User.create(
            {
              email: Email.create('active@example.com'),
              username: 'activeUser',
              password: 'SecurePass123!',
              firstName: 'Active',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Active',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-active',
        mockOrgId
      );
      (userActive as any).props.roles = ['USER'];

      const userInactive = User.reconstitute(
        {
          email: Email.create('inactive@example.com'),
          username: 'inactiveUser',
          passwordHash: User.create(
            {
              email: Email.create('inactive@example.com'),
              username: 'inactiveUser',
              password: 'SecurePass123!',
              firstName: 'Inactive',
              lastName: 'User',
              status: UserStatus.create('INACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Inactive',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-inactive',
        mockOrgId
      );
      (userInactive as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userInactive, userActive]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'status',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // ACTIVE < INACTIVE alphabetically
          expect(value.data[0].status).toBe('ACTIVE');
          expect(value.data[1].status).toBe('INACTIVE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy lastLoginAt When: getting users Then: should sort by lastLoginAt ascending', async () => {
      // Arrange
      const olderDate = new Date('2025-01-01');
      const newerDate = new Date('2026-01-01');

      const userOld = User.reconstitute(
        {
          email: Email.create('old@example.com'),
          username: 'oldLogin',
          passwordHash: User.create(
            {
              email: Email.create('old@example.com'),
              username: 'oldLogin',
              password: 'SecurePass123!',
              firstName: 'Old',
              lastName: 'Login',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Old',
          lastName: 'Login',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
          lastLoginAt: olderDate,
        },
        'user-old',
        mockOrgId
      );
      (userOld as any).props.roles = ['USER'];

      const userNew = User.reconstitute(
        {
          email: Email.create('new@example.com'),
          username: 'newLogin',
          passwordHash: User.create(
            {
              email: Email.create('new@example.com'),
              username: 'newLogin',
              password: 'SecurePass123!',
              firstName: 'New',
              lastName: 'Login',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'New',
          lastName: 'Login',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
          lastLoginAt: newerDate,
        },
        'user-new',
        mockOrgId
      );
      (userNew as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userNew, userOld]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'lastLoginAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].email).toBe('old@example.com');
          expect(value.data[1].email).toBe('new@example.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy lastLoginAt with null values When: getting users Then: null lastLoginAt should sort as earliest', async () => {
      // Arrange
      const loginDate = new Date('2026-01-15');

      const userWithLogin = User.reconstitute(
        {
          email: Email.create('loggedin@example.com'),
          username: 'loggedin',
          passwordHash: User.create(
            {
              email: Email.create('loggedin@example.com'),
              username: 'loggedin',
              password: 'SecurePass123!',
              firstName: 'Logged',
              lastName: 'In',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Logged',
          lastName: 'In',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
          lastLoginAt: loginDate,
        },
        'user-loggedin',
        mockOrgId
      );
      (userWithLogin as any).props.roles = ['USER'];

      const userNoLogin = User.reconstitute(
        {
          email: Email.create('neverloggedin@example.com'),
          username: 'neverloggedin',
          passwordHash: User.create(
            {
              email: Email.create('neverloggedin@example.com'),
              username: 'neverloggedin',
              password: 'SecurePass123!',
              firstName: 'Never',
              lastName: 'Logged',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Never',
          lastName: 'Logged',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
          // lastLoginAt is undefined (null)
        },
        'user-nologin',
        mockOrgId
      );
      (userNoLogin as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userWithLogin, userNoLogin]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'lastLoginAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // null lastLoginAt falls back to 0, so it should come first in asc
          expect(value.data[0].email).toBe('neverloggedin@example.com');
          expect(value.data[0].lastLoginAt).toBeUndefined();
          expect(value.data[1].email).toBe('loggedin@example.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy createdAt When: getting users Then: should sort by createdAt (default branch)', async () => {
      // Arrange
      const users = createMockUsers(3);
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        sortBy: 'createdAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(3);
          // All created at nearly the same time, but the sort code path is exercised
          for (let i = 0; i < value.data.length - 1; i++) {
            const a = new Date(value.data[i].createdAt).getTime();
            const b = new Date(value.data[i + 1].createdAt).getTime();
            expect(a).toBeLessThanOrEqual(b);
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortOrder desc When: getting users Then: should sort in descending order', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('alpha@example.com'),
          username: 'alpha',
          passwordHash: User.create(
            {
              email: Email.create('alpha@example.com'),
              username: 'alpha',
              password: 'SecurePass123!',
              firstName: 'Alpha',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Alpha',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('zulu@example.com'),
          username: 'zulu',
          passwordHash: User.create(
            {
              email: Email.create('zulu@example.com'),
              username: 'zulu',
              password: 'SecurePass123!',
              firstName: 'Zulu',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Zulu',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userA, userB]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'email',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].email).toBe('zulu@example.com');
          expect(value.data[1].email).toBe('alpha@example.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy with no explicit sortOrder When: getting users Then: should default to ascending', async () => {
      // Arrange
      const userA = User.reconstitute(
        {
          email: Email.create('beta@example.com'),
          username: 'beta',
          passwordHash: User.create(
            {
              email: Email.create('beta@example.com'),
              username: 'beta',
              password: 'SecurePass123!',
              firstName: 'Beta',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Beta',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-a',
        mockOrgId
      );
      (userA as any).props.roles = ['USER'];

      const userB = User.reconstitute(
        {
          email: Email.create('alpha@example.com'),
          username: 'alpha',
          passwordHash: User.create(
            {
              email: Email.create('alpha@example.com'),
              username: 'alpha',
              password: 'SecurePass123!',
              firstName: 'Alpha',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Alpha',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        'user-b',
        mockOrgId
      );
      (userB as any).props.roles = ['USER'];

      mockUserRepository.findAll.mockResolvedValue([userA, userB]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'email',
        // no sortOrder specified — should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].email).toBe('alpha@example.com');
          expect(value.data[1].email).toBe('beta@example.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: search term matching email When: getting users Then: should filter by email match', async () => {
      // Arrange
      const users = createMockUsers(5);
      // Override one user's email to something unique
      users[2].update({ email: 'specialfind@company.com' });
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        search: 'specialfind',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].email).toBe('specialfind@company.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: search term matching username When: getting users Then: should filter by username match', async () => {
      // Arrange
      const users = createMockUsers(5);
      users[3].update({ username: 'uniqueadmin' });
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        search: 'uniqueadmin',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].username).toBe('uniqueadmin');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: search term matching lastName When: getting users Then: should filter by lastName match', async () => {
      // Arrange
      const users = createMockUsers(5);
      users[1].update({ lastName: 'Ramirez' });
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        search: 'ramirez',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].lastName).toBe('Ramirez');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: search is case insensitive When: getting users Then: should match regardless of case', async () => {
      // Arrange
      const users = createMockUsers(3);
      users[0].update({ firstName: 'Jennifer' });
      mockUserRepository.findAll.mockResolvedValue(users);

      const request = {
        orgId: mockOrgId,
        search: 'JENNIFER',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].firstName).toBe('Jennifer');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
