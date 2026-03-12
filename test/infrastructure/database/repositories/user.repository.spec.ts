import { User } from '@auth/domain/entities/user.entity';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';

describe('UserRepository', () => {
  let repository: UserRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { user: Record<string, jest.Mock<any>> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCacheService: Record<string, jest.Mock<any>>;

  const mockUserData = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword123',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    lastLoginAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [
      {
        role: {
          name: 'admin',
          permissions: [{ permission: { name: 'read:users' } }],
        },
      },
    ],
  };

  beforeEach(() => {
    mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    repository = new UserRepository(
      mockPrismaService as unknown as PrismaService,
      mockCacheService as any
    );
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return user from database', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-123', orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: cached user When: finding by id Then: should return user from cache', async () => {
      // Arrange
      const cachedUser = User.reconstitute(
        {
          email: Email.create('cached@example.com'),
          username: 'cacheduser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Cached',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: ['admin'],
          permissions: ['read:users'],
        } as any,
        'user-123',
        'org-123'
      );
      mockCacheService.get.mockResolvedValue(ok(cachedUser));

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result).toEqual(cachedUser);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.user.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('user-123', 'org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('Given: valid email and orgId When: finding by email Then: should return user', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repository.findByEmail('test@example.com', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: non-existent email When: finding by email Then: should return null', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail('nonexistent@example.com', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by email Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(repository.findByEmail('test@example.com', 'org-123')).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('findByUsername', () => {
    it('Given: valid username and orgId When: finding by username Then: should return user', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repository.findByUsername('testuser', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser');
    });

    it('Given: non-existent username When: finding by username Then: should return null', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByUsername('nonexistent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by username Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockRejectedValue(new Error('Query timeout'));

      // Act & Assert
      await expect(repository.findByUsername('testuser', 'org-123')).rejects.toThrow(
        'Query timeout'
      );
    });
  });

  describe('findByStatus', () => {
    it('Given: active status When: finding by status Then: should return active users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([mockUserData]);

      // Act
      const result = await repository.findByStatus('active', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true, orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: inactive status When: finding by status Then: should return inactive users', async () => {
      // Arrange
      const inactiveUser = { ...mockUserData, isActive: false };
      mockPrismaService.user.findMany.mockResolvedValue([inactiveUser]);

      // Act
      const result = await repository.findByStatus('inactive', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { isActive: false, orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: database error When: finding by status Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findByStatus('active', 'org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findByRole', () => {
    it('Given: valid roleId When: finding by role Then: should return users with that role', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([mockUserData]);

      // Act
      const result = await repository.findByRole('role-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          userRoles: {
            some: {
              roleId: 'role-123',
              orgId: 'org-123',
            },
          },
        },
        include: expect.any(Object),
      });
    });

    it('Given: no users with role When: finding by role Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByRole('role-999', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding by role Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findByRole('role-123', 'org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('findActiveUsers', () => {
    it('Given: active users exist When: finding active users Then: should return them', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([mockUserData]);

      // Act
      const result = await repository.findActiveUsers('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findLockedUsers', () => {
    it('Given: locked users exist When: finding locked users Then: should return them', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findLockedUsers('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('existsByEmail', () => {
    it('Given: existing email When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByEmail('test@example.com', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existing email When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByEmail('nonexistent@example.com', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking email existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.existsByEmail('test@example.com', 'org-123')).rejects.toThrow(
        'Count failed'
      );
    });
  });

  describe('existsByUsername', () => {
    it('Given: existing username When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByUsername('testuser', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existing username When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByUsername('nonexistent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking username existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue(new Error('Database unreachable'));

      // Act & Assert
      await expect(repository.existsByUsername('testuser', 'org-123')).rejects.toThrow(
        'Database unreachable'
      );
    });
  });

  describe('countByStatus', () => {
    it('Given: active users When: counting by status Then: should return count', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(5);

      // Act
      const result = await repository.countByStatus('active', 'org-123');

      // Assert
      expect(result).toBe(5);
    });

    it('Given: database error When: counting by status Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue(new Error('Count error'));

      // Act & Assert
      await expect(repository.countByStatus('active', 'org-123')).rejects.toThrow('Count error');
    });
  });

  describe('findUsersWithFailedLogins', () => {
    it('Given: users with failed logins When: finding them Then: should return users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([mockUserData]);

      // Act
      const result = await repository.findUsersWithFailedLogins('org-123', 3);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('Given: users exist When: finding all Then: should return all users', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([mockUserData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: no users When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue(new Error('FindMany failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('FindMany failed');
    });
  });

  describe('save', () => {
    it('Given: existing user When: saving Then: should update user', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('updated@example.com'),
          username: 'updateduser',
          passwordHash: Password.createHashed('newhash'),
          firstName: 'Updated',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: ['admin'],
          permissions: ['read:users'],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserData);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserData,
        email: 'updated@example.com',
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('Given: new user When: saving Then: should create user', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('new@example.com'),
          username: 'newuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'New',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'new-user-id',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUserData,
        id: 'new-user-id',
        email: 'new@example.com',
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserData);
      mockPrismaService.user.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(repository.save(user)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('Given: existing user When: deleting Then: should delete user', async () => {
      // Arrange
      mockPrismaService.user.deleteMany.mockResolvedValue({ count: 1 });
      mockCacheService.delete.mockResolvedValue(ok(undefined));

      // Act
      await repository.delete('user-123', 'org-123');

      // Assert
      expect(mockPrismaService.user.deleteMany).toHaveBeenCalledWith({
        where: { id: 'user-123', orgId: 'org-123' },
      });
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('user-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('exists', () => {
    it('Given: existing user When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('user-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existing user When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue(new Error('Existence check failed'));

      // Act & Assert
      await expect(repository.exists('user-123', 'org-123')).rejects.toThrow(
        'Existence check failed'
      );
    });
  });

  describe('repository without cache service', () => {
    it('Given: no cache service When: finding by id Then: should query database directly', async () => {
      // Arrange
      const repoWithoutCache = new UserRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repoWithoutCache.findById('user-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
    });

    it('Given: no cache service When: saving existing user Then: should not call cache operations', async () => {
      // Arrange
      const repoWithoutCache = new UserRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: ['admin'],
          permissions: ['read:users'],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserData);
      mockPrismaService.user.update.mockResolvedValue(mockUserData);

      // Act
      const result = await repoWithoutCache.save(user);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: saving new user Then: should not call cache operations', async () => {
      // Arrange
      const repoWithoutCache = new UserRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      const user = User.reconstitute(
        {
          email: Email.create('new@example.com'),
          username: 'newuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'New',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'new-user-id',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUserData,
        id: 'new-user-id',
        email: 'new@example.com',
      });

      // Act
      const result = await repoWithoutCache.save(user);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: deleting user Then: should not call cache invalidation', async () => {
      // Arrange
      const repoWithoutCache = new UserRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.user.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repoWithoutCache.delete('user-123', 'org-123');

      // Assert
      expect(mockPrismaService.user.deleteMany).toHaveBeenCalled();
      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: finding by email Then: should skip cache entirely', async () => {
      // Arrange
      const repoWithoutCache = new UserRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repoWithoutCache.findByEmail('test@example.com', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('findById - optional field branches', () => {
    it('Given: user with null lastLoginAt When: finding by id Then: lastLoginAt should be undefined', async () => {
      // Arrange
      const userNoLastLogin = { ...mockUserData, lastLoginAt: null };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNoLastLogin);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.lastLoginAt).toBeUndefined();
    });

    it('Given: user with null lockedUntil When: finding by id Then: lockedUntil should be undefined', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.lockedUntil).toBeUndefined();
    });

    it('Given: user with null phone, timezone, language, jobTitle, department When: finding by id Then: all should be undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        phone: null,
        timezone: null,
        language: null,
        jobTitle: null,
        department: null,
      };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNullOptionals);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.phone).toBeUndefined();
      expect(result?.timezone).toBeUndefined();
      expect(result?.language).toBeUndefined();
      expect(result?.jobTitle).toBeUndefined();
      expect(result?.department).toBeUndefined();
    });

    it('Given: user with set phone, timezone, language, jobTitle, department When: finding by id Then: all should be set', async () => {
      // Arrange
      const userAllOptionals = {
        ...mockUserData,
        phone: '+1234567890',
        timezone: 'America/New_York',
        language: 'en',
        jobTitle: 'Engineer',
        department: 'Engineering',
      };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userAllOptionals);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.phone).toBe('+1234567890');
      expect(result?.timezone).toBe('America/New_York');
      expect(result?.language).toBe('en');
      expect(result?.jobTitle).toBe('Engineer');
      expect(result?.department).toBe('Engineering');
    });

    it('Given: user with null failedLoginAttempts When: finding by id Then: should default to 0 via ??', async () => {
      // Arrange
      const userNullAttempts = { ...mockUserData, failedLoginAttempts: null };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNullAttempts);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.failedLoginAttempts).toBe(0);
    });

    it('Given: user with null mustChangePassword When: finding by id Then: should default to false via ??', async () => {
      // Arrange
      const userNullMustChange = { ...mockUserData, mustChangePassword: null };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNullMustChange);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.mustChangePassword).toBe(false);
    });

    it('Given: inactive user When: finding by id Then: status should be INACTIVE', async () => {
      // Arrange
      const inactiveUser = { ...mockUserData, isActive: false };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(inactiveUser);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('INACTIVE');
    });

    it('Given: user with empty userRoles When: finding by id Then: roles and permissions should be empty', async () => {
      // Arrange
      const userNoRoles = { ...mockUserData, userRoles: [] };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNoRoles);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.roles).toEqual([]);
      expect(result?.permissions).toEqual([]);
    });

    it('Given: user with multiple roles and permissions When: finding by id Then: should flatMap permissions from all roles', async () => {
      // Arrange
      const userMultiRoles = {
        ...mockUserData,
        userRoles: [
          {
            role: {
              name: 'admin',
              permissions: [
                { permission: { name: 'read:users' } },
                { permission: { name: 'write:users' } },
              ],
            },
          },
          {
            role: {
              name: 'editor',
              permissions: [{ permission: { name: 'read:posts' } }],
            },
          },
        ],
      };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userMultiRoles);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.roles).toEqual(['admin', 'editor']);
      expect(result?.permissions).toEqual(['read:users', 'write:users', 'read:posts']);
    });

    it('Given: user with role that has no permissions When: finding by id Then: permissions should be empty for that role', async () => {
      // Arrange
      const userRoleNoPerms = {
        ...mockUserData,
        userRoles: [
          {
            role: {
              name: 'viewer',
              permissions: [],
            },
          },
        ],
      };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userRoleNoPerms);

      // Act
      const result = await repository.findById('user-123', 'org-123');

      // Assert
      expect(result?.roles).toEqual(['viewer']);
      expect(result?.permissions).toEqual([]);
    });
  });

  describe('findById - non-Error throw branch', () => {
    it('Given: database throws a non-Error When: finding by id Then: should log and rethrow', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.user.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findById('user-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('findByEmail - optional field and cache branches', () => {
    it('Given: cached user by email When: finding by email Then: should return from cache', async () => {
      // Arrange
      const cachedUser = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Cached',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: ['admin'],
          permissions: ['read:users'],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserData);
      mockCacheService.get.mockResolvedValue(ok(cachedUser));

      // Act
      const result = await repository.findByEmail('test@example.com', 'org-123');

      // Assert
      expect(result).toEqual(cachedUser);
    });

    it('Given: user with null optional fields When: finding by email Then: should map to undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        phone: null,
        timezone: null,
        language: null,
        jobTitle: null,
        department: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(userNullOptionals);

      // Act
      const result = await repository.findByEmail('test@example.com', 'org-123');

      // Assert
      expect(result?.lastLoginAt).toBeUndefined();
      expect(result?.lockedUntil).toBeUndefined();
      expect(result?.phone).toBeUndefined();
      expect(result?.timezone).toBeUndefined();
      expect(result?.language).toBeUndefined();
      expect(result?.jobTitle).toBeUndefined();
      expect(result?.department).toBeUndefined();
      expect(result?.failedLoginAttempts).toBe(0);
      expect(result?.mustChangePassword).toBe(false);
    });

    it('Given: inactive user found by email When: finding by email Then: status should be INACTIVE', async () => {
      // Arrange
      const inactiveUser = { ...mockUserData, isActive: false };
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.user.findFirst.mockResolvedValue(inactiveUser);

      // Act
      const result = await repository.findByEmail('test@example.com', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('INACTIVE');
    });

    it('Given: non-Error thrown When: finding by email Then: should log and rethrow', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockRejectedValue(42);

      // Act & Assert
      await expect(repository.findByEmail('test@example.com', 'org-123')).rejects.toBe(42);
    });
  });

  describe('findByUsername - optional field branches', () => {
    it('Given: user with null optional fields When: finding by username Then: should map to undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        phone: null,
        timezone: null,
        language: null,
        jobTitle: null,
        department: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(userNullOptionals);

      // Act
      const result = await repository.findByUsername('testuser', 'org-123');

      // Assert
      expect(result?.lastLoginAt).toBeUndefined();
      expect(result?.lockedUntil).toBeUndefined();
      expect(result?.failedLoginAttempts).toBe(0);
      expect(result?.mustChangePassword).toBe(false);
    });

    it('Given: inactive user found by username When: finding by username Then: status should be INACTIVE', async () => {
      // Arrange
      const inactiveUser = { ...mockUserData, isActive: false };
      mockPrismaService.user.findFirst.mockResolvedValue(inactiveUser);

      // Act
      const result = await repository.findByUsername('testuser', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('INACTIVE');
    });

    it('Given: user with empty roles When: finding by username Then: roles and permissions should be empty', async () => {
      // Arrange
      const userNoRoles = { ...mockUserData, userRoles: [] };
      mockPrismaService.user.findFirst.mockResolvedValue(userNoRoles);

      // Act
      const result = await repository.findByUsername('testuser', 'org-123');

      // Assert
      expect(result?.roles).toEqual([]);
      expect(result?.permissions).toEqual([]);
    });

    it('Given: non-Error thrown When: finding by username Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByUsername('testuser', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('findByStatus - optional field branches', () => {
    it('Given: users with null optional fields When: finding by status Then: should map to undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findMany.mockResolvedValue([userNullOptionals]);

      // Act
      const result = await repository.findByStatus('active', 'org-123');

      // Assert
      expect(result[0].lastLoginAt).toBeUndefined();
      expect(result[0].lockedUntil).toBeUndefined();
      expect(result[0].failedLoginAttempts).toBe(0);
      expect(result[0].mustChangePassword).toBe(false);
    });

    it('Given: users with empty userRoles When: finding by status Then: roles and permissions should be empty', async () => {
      // Arrange
      const userNoRoles = { ...mockUserData, userRoles: [] };
      mockPrismaService.user.findMany.mockResolvedValue([userNoRoles]);

      // Act
      const result = await repository.findByStatus('active', 'org-123');

      // Assert
      expect(result[0].roles).toEqual([]);
      expect(result[0].permissions).toEqual([]);
    });

    it('Given: non-Error thrown When: finding by status Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue('status error');

      // Act & Assert
      await expect(repository.findByStatus('active', 'org-123')).rejects.toBe('status error');
    });
  });

  describe('findByRole - optional field branches', () => {
    it('Given: users with null optional fields When: finding by role Then: should map to undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findMany.mockResolvedValue([userNullOptionals]);

      // Act
      const result = await repository.findByRole('role-123', 'org-123');

      // Assert
      expect(result[0].lastLoginAt).toBeUndefined();
      expect(result[0].lockedUntil).toBeUndefined();
      expect(result[0].failedLoginAttempts).toBe(0);
      expect(result[0].mustChangePassword).toBe(false);
    });

    it('Given: non-Error thrown When: finding by role Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue('role error');

      // Act & Assert
      await expect(repository.findByRole('role-123', 'org-123')).rejects.toBe('role error');
    });
  });

  describe('findAll - optional field branches', () => {
    it('Given: users with null optional fields When: finding all Then: should map to undefined', async () => {
      // Arrange
      const userNullOptionals = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findMany.mockResolvedValue([userNullOptionals]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result[0].lastLoginAt).toBeUndefined();
      expect(result[0].lockedUntil).toBeUndefined();
      expect(result[0].failedLoginAttempts).toBe(0);
      expect(result[0].mustChangePassword).toBe(false);
    });

    it('Given: inactive users When: finding all Then: status should be INACTIVE', async () => {
      // Arrange
      const inactiveUser = { ...mockUserData, isActive: false };
      mockPrismaService.user.findMany.mockResolvedValue([inactiveUser]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result[0].status.getValue()).toBe('INACTIVE');
    });

    it('Given: users with empty userRoles When: finding all Then: roles and permissions should be empty', async () => {
      // Arrange
      const userNoRoles = { ...mockUserData, userRoles: [] };
      mockPrismaService.user.findMany.mockResolvedValue([userNoRoles]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result[0].roles).toEqual([]);
      expect(result[0].permissions).toEqual([]);
    });

    it('Given: non-Error thrown When: finding all Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.findMany.mockRejectedValue('findall error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('findall error');
    });
  });

  describe('save - optional field branches', () => {
    it('Given: updated user with null optional fields from DB When: saving Then: should map to undefined', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'user-123',
        'org-123'
      );
      const dbResult = {
        ...mockUserData,
        lastLoginAt: null,
        lockedUntil: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserData);
      mockPrismaService.user.update.mockResolvedValue(dbResult);
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result.lastLoginAt).toBeUndefined();
      expect(result.lockedUntil).toBeUndefined();
      expect(result.failedLoginAttempts).toBe(0);
      expect(result.mustChangePassword).toBe(false);
    });

    it('Given: updated user that is inactive When: saving Then: status should be INACTIVE', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserData);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserData,
        isActive: false,
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result.status.getValue()).toBe('INACTIVE');
    });

    it('Given: new user with null optional fields from DB When: saving new Then: should map to undefined', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('new@example.com'),
          username: 'newuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'New',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'new-user-id',
        'org-123'
      );
      const dbResult = {
        ...mockUserData,
        id: 'new-user-id',
        email: 'new@example.com',
        lastLoginAt: null,
        lockedUntil: null,
        failedLoginAttempts: null,
        mustChangePassword: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(dbResult);
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result.lastLoginAt).toBeUndefined();
      expect(result.lockedUntil).toBeUndefined();
      expect(result.failedLoginAttempts).toBe(0);
      expect(result.mustChangePassword).toBe(false);
    });

    it('Given: new inactive user When: saving Then: status should be INACTIVE', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('new@example.com'),
          username: 'newuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'New',
          lastName: 'User',
          status: UserStatus.create('INACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'new-user-id',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUserData,
        id: 'new-user-id',
        isActive: false,
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result.status.getValue()).toBe('INACTIVE');
    });

    it('Given: save throws a non-Error When: saving Then: should log unknown error and rethrow', async () => {
      // Arrange
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: Password.createHashed('hash'),
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          roles: [],
          permissions: [],
        } as any,
        'user-123',
        'org-123'
      );
      mockPrismaService.user.findUnique.mockRejectedValue('non-error-string');

      // Act & Assert
      await expect(repository.save(user)).rejects.toBe('non-error-string');
    });
  });

  describe('delete - non-Error throw branch', () => {
    it('Given: non-Error thrown When: deleting Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.deleteMany.mockRejectedValue('delete string error');

      // Act & Assert
      await expect(repository.delete('user-123', 'org-123')).rejects.toBe('delete string error');
    });
  });

  describe('exists - non-Error throw branch', () => {
    it('Given: non-Error thrown When: checking existence Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue('existence error');

      // Act & Assert
      await expect(repository.exists('user-123', 'org-123')).rejects.toBe('existence error');
    });
  });

  describe('existsByEmail - non-Error throw branch', () => {
    it('Given: non-Error thrown When: checking email existence Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue('email count error');

      // Act & Assert
      await expect(repository.existsByEmail('test@example.com', 'org-123')).rejects.toBe(
        'email count error'
      );
    });
  });

  describe('existsByUsername - non-Error throw branch', () => {
    it('Given: non-Error thrown When: checking username existence Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue('username count error');

      // Act & Assert
      await expect(repository.existsByUsername('testuser', 'org-123')).rejects.toBe(
        'username count error'
      );
    });
  });

  describe('countByStatus - non-Error throw and inactive branches', () => {
    it('Given: inactive status When: counting by status Then: should query isActive=false', async () => {
      // Arrange
      mockPrismaService.user.count.mockResolvedValue(3);

      // Act
      const result = await repository.countByStatus('inactive', 'org-123');

      // Assert
      expect(result).toBe(3);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { isActive: false, orgId: 'org-123' },
      });
    });

    it('Given: non-Error thrown When: counting by status Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.user.count.mockRejectedValue('count status error');

      // Act & Assert
      await expect(repository.countByStatus('active', 'org-123')).rejects.toBe(
        'count status error'
      );
    });
  });
});
