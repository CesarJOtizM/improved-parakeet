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
      mockCacheService
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
        },
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
        },
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
        },
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
        },
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
  });
});
