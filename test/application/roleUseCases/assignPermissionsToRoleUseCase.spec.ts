import { AssignPermissionsToRoleUseCase } from '@application/roleUseCases/assignPermissionsToRoleUseCase';
import { Role, type IRoleProps } from '@auth/domain/entities/role.entity';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('AssignPermissionsToRoleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleId = 'role-123';
  const mockAssignedBy = 'admin-123';
  const mockPermissionIds = ['perm-1', 'perm-2'];

  let useCase: AssignPermissionsToRoleUseCase;
  let mockRoleRepository: jest.Mocked<IRoleRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRoleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      findActiveRoles: jest.fn(),
      findRolesByUser: jest.fn(),
      existsByName: jest.fn(),
      countByStatus: jest.fn(),
      findRolesWithPermissions: jest.fn(),
      findSystemRoles: jest.fn(),
      findCustomRoles: jest.fn(),
      findAvailableRolesForOrganization: jest.fn(),
    } as jest.Mocked<IRoleRepository>;

    mockPrismaService = {
      permission: {
        findMany: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new AssignPermissionsToRoleUseCase(mockRoleRepository, mockPrismaService);
  });

  describe('execute', () => {
    const createMockRole = (overrides?: Partial<IRoleProps>): Role => {
      const props: IRoleProps = {
        name: 'CUSTOM_ROLE',
        description: 'Test role',
        isActive: true,
        isSystem: false,
        ...overrides,
      };
      return Role.reconstitute(props, mockRoleId, mockOrgId);
    };

    it('Given: valid role and permissions When: assigning permissions Then: should return success result', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      const mockPermissions = [
        { id: 'perm-1', name: 'PERMISSION_1', module: 'TEST', action: 'READ', description: null },
        { id: 'perm-2', name: 'PERMISSION_2', module: 'TEST', action: 'WRITE', description: null },
      ];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.rolePermission.createMany.mockResolvedValue({ count: 2 });

      const request = {
        roleId: mockRoleId,
        permissionIds: mockPermissionIds,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Permissions assigned successfully');
          expect(value.data.roleId).toBe(mockRoleId);
          expect(value.data.assignedPermissions).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockPrismaService.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: mockRoleId },
      });
      expect(mockPrismaService.rolePermission.createMany).toHaveBeenCalled();
    });

    it('Given: empty permission ids When: assigning permissions Then: should return ValidationError', async () => {
      // Arrange
      const request = {
        roleId: mockRoleId,
        permissionIds: [],
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('At least one permission ID is required');
        }
      );
    });

    it('Given: non-existent role id When: assigning permissions Then: should return NotFoundError', async () => {
      // Arrange
      mockRoleRepository.findById.mockResolvedValue(null);

      const request = {
        roleId: 'non-existent-id',
        permissionIds: mockPermissionIds,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Role not found');
        }
      );
    });

    it('Given: role from different org When: assigning permissions Then: should return NotFoundError', async () => {
      // Arrange
      const otherOrgRole = Role.reconstitute(
        {
          name: 'CUSTOM_ROLE',
          isActive: true,
          isSystem: false,
        },
        'other-role-id',
        'other-org-id'
      );
      mockRoleRepository.findById.mockResolvedValue(otherOrgRole);

      const request = {
        roleId: 'other-role-id',
        permissionIds: mockPermissionIds,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Role not found in this organization');
        }
      );
    });

    it('Given: non-existent permission ids When: assigning permissions Then: should return NotFoundError', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'PERMISSION_1', module: 'TEST', action: 'READ', description: null },
      ]);

      const request = {
        roleId: mockRoleId,
        permissionIds: ['perm-1', 'non-existent-perm'],
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Permissions not found');
        }
      );
    });

    it('Given: system role from different org When: assigning permissions Then: should succeed because isSystem bypasses org check', async () => {
      // Arrange
      const systemRole = Role.reconstitute(
        {
          name: 'SYSTEM_ROLE',
          isActive: true,
          isSystem: true,
        },
        'system-role-id',
        'different-org-id'
      );
      mockRoleRepository.findById.mockResolvedValue(systemRole);
      const mockPermissions = [
        { id: 'perm-1', name: 'PERMISSION_1', module: 'TEST', action: 'READ', description: null },
      ];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.rolePermission.createMany.mockResolvedValue({ count: 1 });

      const request = {
        roleId: 'system-role-id',
        permissionIds: ['perm-1'],
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.roleName).toBe('SYSTEM_ROLE');
          expect(value.data.assignedPermissions).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: multiple non-existent permissions When: assigning Then: should list all missing IDs', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const request = {
        roleId: mockRoleId,
        permissionIds: ['missing-1', 'missing-2'],
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('missing-1');
          expect(error.message).toContain('missing-2');
        }
      );
    });
  });
});
