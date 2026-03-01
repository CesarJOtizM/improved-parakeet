import { Role } from '@auth/domain/entities/role.entity';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RoleRepository } from '@infrastructure/database/repositories/role.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('RoleRepository', () => {
  let repository: RoleRepository;

  type MockFn = jest.Mock<unknown, unknown[]>;

  let mockPrismaService: {
    role: Record<string, MockFn>;
    userRole: Record<string, MockFn>;
  };

  const mockRoleData = {
    id: 'role-123',
    name: 'admin',
    description: 'Administrator role',
    isActive: true,
    isSystem: false,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemRoleData = {
    id: 'role-system',
    name: 'super_admin',
    description: 'System administrator',
    isActive: true,
    isSystem: true,
    orgId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      role: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
    };

    repository = new RoleRepository(mockPrismaService as unknown as PrismaService);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return role', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(mockRoleData);

      // Act
      const result = await repository.findById('role-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('role-123');
      expect(result?.name).toBe('admin');
    });

    it('Given: valid id without orgId When: finding by id Then: should return role', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(mockSystemRoleData);

      // Act
      const result = await repository.findById('role-system');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.isSystem).toBe(true);
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('role-123', 'org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('Given: roles exist When: finding all Then: should return roles', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleData, mockSystemRoleData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('findByName', () => {
    it('Given: valid name and orgId When: finding by name Then: should return role', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(mockRoleData);

      // Act
      const result = await repository.findByName('admin', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe('admin');
    });

    it('Given: valid name without orgId When: finding system role Then: should return role', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(mockSystemRoleData);

      // Act
      const result = await repository.findByName('super_admin');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.isSystem).toBe(true);
    });

    it('Given: non-existent name When: finding by name Then: should return null', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByName('nonexistent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by name Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findFirst.mockRejectedValue(new Error('Name lookup failed'));

      // Act & Assert
      await expect(repository.findByName('admin', 'org-123')).rejects.toThrow('Name lookup failed');
    });
  });

  describe('findByStatus', () => {
    it('Given: active roles exist When: finding by status Then: should return active roles', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleData]);

      // Act
      const result = await repository.findByStatus(true, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('Given: inactive roles exist When: finding inactive Then: should return them', async () => {
      // Arrange
      const inactiveRole = { ...mockRoleData, isActive: false };
      mockPrismaService.role.findMany.mockResolvedValue([inactiveRole]);

      // Act
      const result = await repository.findByStatus(false, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });

    it('Given: database error When: finding by status Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('Status query failed'));

      // Act & Assert
      await expect(repository.findByStatus(true, 'org-123')).rejects.toThrow('Status query failed');
    });
  });

  describe('findActiveRoles', () => {
    it('Given: active roles exist When: finding active roles Then: should return them', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleData]);

      // Act
      const result = await repository.findActiveRoles('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findRolesByUser', () => {
    it('Given: user has roles When: finding roles by user Then: should return roles', async () => {
      // Arrange
      mockPrismaService.userRole.findMany.mockResolvedValue([{ role: mockRoleData }]);

      // Act
      const result = await repository.findRolesByUser('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('admin');
    });

    it('Given: user has no roles When: finding roles Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.userRole.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findRolesByUser('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding roles by user Then: should throw error', async () => {
      // Arrange
      mockPrismaService.userRole.findMany.mockRejectedValue(new Error('User roles query failed'));

      // Act & Assert
      await expect(repository.findRolesByUser('user-123', 'org-123')).rejects.toThrow(
        'User roles query failed'
      );
    });
  });

  describe('existsByName', () => {
    it('Given: role with name exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByName('admin', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: role with name does not exist When: checking Then: should return false', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByName('nonexistent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: checking system role without orgId When: checking Then: should search system roles', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByName('super_admin');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: { name: 'super_admin', orgId: null },
      });
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.existsByName('admin', 'org-123')).rejects.toThrow('Count failed');
    });
  });

  describe('countByStatus', () => {
    it('Given: roles with status exist When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(5);

      // Act
      const result = await repository.countByStatus(true, 'org-123');

      // Assert
      expect(result).toBe(5);
    });

    it('Given: database error When: counting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.count.mockRejectedValue(new Error('Count error'));

      // Act & Assert
      await expect(repository.countByStatus(true, 'org-123')).rejects.toThrow('Count error');
    });
  });

  describe('findRolesWithPermissions', () => {
    it('Given: roles with permissions exist When: finding Then: should return roles', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleData]);

      // Act
      const result = await repository.findRolesWithPermissions(['perm-1', 'perm-2'], 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding roles with permissions Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('Permission query failed'));

      // Act & Assert
      await expect(repository.findRolesWithPermissions(['perm-1'], 'org-123')).rejects.toThrow(
        'Permission query failed'
      );
    });
  });

  describe('save', () => {
    it('Given: existing custom role When: saving Then: should update role', async () => {
      // Arrange
      const role = Role.reconstitute(
        {
          name: 'updated-admin',
          description: 'Updated description',
          isActive: true,
          isSystem: false,
        },
        'role-123',
        'org-123'
      );
      mockPrismaService.role.findUnique.mockResolvedValue(mockRoleData);
      mockPrismaService.role.update.mockResolvedValue({
        ...mockRoleData,
        name: 'updated-admin',
      });

      // Act
      const result = await repository.save(role);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({ where: { id: 'role-123' } });
      expect(mockPrismaService.role.update).toHaveBeenCalled();
    });

    it('Given: new custom role When: saving Then: should create role', async () => {
      // Arrange
      const role = Role.create(
        {
          name: 'new-role',
          description: 'New role',
          isActive: true,
          isSystem: false,
        },
        'org-123'
      );

      // The save() method now uses findUnique to check if role exists.
      // Return null to indicate the role doesn't exist yet, triggering create.
      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue({
        id: role.id,
        name: 'new-role',
        description: 'New role',
        isActive: true,
        isSystem: false,
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await repository.save(role);

      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('new-role');
      expect(mockPrismaService.role.create).toHaveBeenCalled();
    });

    it('Given: system role with orgId When: saving Then: should throw error', async () => {
      // Arrange
      const role = Role.reconstitute(
        {
          name: 'system-role',
          isActive: true,
          isSystem: true,
        },
        'role-id',
        'org-123' // System roles should not have orgId
      );

      // Act & Assert
      await expect(repository.save(role)).rejects.toThrow(
        'System roles cannot have an organization ID'
      );
    });

    it('Given: custom role without orgId When: saving Then: should throw error', async () => {
      // Arrange
      const role = Role.reconstitute(
        {
          name: 'custom-role',
          isActive: true,
          isSystem: false,
        },
        'role-id',
        undefined // Custom roles must have orgId
      );

      // Act & Assert
      await expect(repository.save(role)).rejects.toThrow(
        'Custom roles must have an organization ID'
      );
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const role = Role.reconstitute(
        {
          name: 'test-role',
          isActive: true,
          isSystem: false,
        },
        'role-123',
        'org-123'
      );
      mockPrismaService.role.findUnique.mockResolvedValue(mockRoleData);
      mockPrismaService.role.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(repository.save(role)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('Given: existing role When: deleting Then: should delete role', async () => {
      // Arrange
      mockPrismaService.role.delete.mockResolvedValue(mockRoleData);

      // Act
      await repository.delete('role-123', 'org-123');

      // Assert
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-123' },
      });
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.delete.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('role-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('exists', () => {
    it('Given: role exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('role-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: role does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: checking without orgId When: checking Then: should work', async () => {
      // Arrange
      mockPrismaService.role.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('role-system');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.count.mockRejectedValue(new Error('Existence check failed'));

      // Act & Assert
      await expect(repository.exists('role-123', 'org-123')).rejects.toThrow(
        'Existence check failed'
      );
    });
  });

  describe('findSystemRoles', () => {
    it('Given: system roles exist When: finding system roles Then: should return them', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockSystemRoleData]);

      // Act
      const result = await repository.findSystemRoles();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isSystem).toBe(true);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { isSystem: true, orgId: null },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: database error When: finding system roles Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('System roles query failed'));

      // Act & Assert
      await expect(repository.findSystemRoles()).rejects.toThrow('System roles query failed');
    });
  });

  describe('findCustomRoles', () => {
    it('Given: custom roles exist When: finding custom roles Then: should return them', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleData]);

      // Act
      const result = await repository.findCustomRoles('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isSystem).toBe(false);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: { isSystem: false, orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: database error When: finding custom roles Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('Custom roles query failed'));

      // Act & Assert
      await expect(repository.findCustomRoles('org-123')).rejects.toThrow(
        'Custom roles query failed'
      );
    });
  });

  describe('findAvailableRolesForOrganization', () => {
    it('Given: roles available for org When: finding Then: should return system and custom roles', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockResolvedValue([mockSystemRoleData, mockRoleData]);

      // Act
      const result = await repository.findAvailableRolesForOrganization('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isSystem: true, orgId: null },
            { isSystem: false, orgId: 'org-123' },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: database error When: finding available roles Then: should throw error', async () => {
      // Arrange
      mockPrismaService.role.findMany.mockRejectedValue(new Error('Available roles query failed'));

      // Act & Assert
      await expect(repository.findAvailableRolesForOrganization('org-123')).rejects.toThrow(
        'Available roles query failed'
      );
    });
  });
});
