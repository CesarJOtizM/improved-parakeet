import { GetRolePermissionsUseCase } from '@application/roleUseCases/getRolePermissionsUseCase';
import { Role } from '@auth/domain/entities/role.entity';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('GetRolePermissionsUseCase', () => {
  const mockOrgId = 'org-123';
  const mockRoleId = 'role-456';

  let useCase: GetRolePermissionsUseCase;
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
      rolePermission: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetRolePermissionsUseCase(mockRoleRepository, mockPrismaService);
  });

  describe('execute', () => {
    it('Given: role exists with permissions When: getting role permissions Then: should return success with mapped data', async () => {
      // Arrange
      const role = Role.reconstitute(
        { name: 'ADMIN', isActive: true, isSystem: false },
        mockRoleId,
        mockOrgId
      );
      mockRoleRepository.findById.mockResolvedValue(role);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          roleId: mockRoleId,
          permissionId: 'perm-1',
          permission: {
            id: 'perm-1',
            name: 'USERS:CREATE',
            description: 'Create users',
            module: 'USERS',
            action: 'CREATE',
          },
        },
        {
          roleId: mockRoleId,
          permissionId: 'perm-2',
          permission: {
            id: 'perm-2',
            name: 'SALES:READ',
            description: null,
            module: 'SALES',
            action: 'READ',
          },
        },
      ]);

      // Act
      const result = await useCase.execute({ roleId: mockRoleId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Role permissions retrieved successfully');
          expect(value.data).toHaveLength(2);

          expect(value.data[0].id).toBe('perm-1');
          expect(value.data[0].name).toBe('USERS:CREATE');
          expect(value.data[0].description).toBe('Create users');
          expect(value.data[0].module).toBe('USERS');
          expect(value.data[0].action).toBe('CREATE');

          expect(value.data[1].id).toBe('perm-2');
          expect(value.data[1].description).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(mockPrismaService.rolePermission.findMany).toHaveBeenCalledWith({
        where: { roleId: mockRoleId },
        include: { permission: true },
      });
    });

    it('Given: role not found When: getting role permissions Then: should return NotFoundError', async () => {
      // Arrange
      mockRoleRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({ roleId: 'non-existent', orgId: mockOrgId });

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
      expect(mockPrismaService.rolePermission.findMany).not.toHaveBeenCalled();
    });

    it('Given: role exists with no permissions When: getting role permissions Then: should return empty array', async () => {
      // Arrange
      const role = Role.reconstitute(
        { name: 'EMPTY_ROLE', isActive: true, isSystem: false },
        mockRoleId,
        mockOrgId
      );
      mockRoleRepository.findById.mockResolvedValue(role);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ roleId: mockRoleId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
          expect(value.data).toEqual([]);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty roleId When: getting role permissions Then: should return ValidationError', async () => {
      // Act
      const result = await useCase.execute({ roleId: '', orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Role ID is required');
        }
      );
      expect(mockRoleRepository.findById).not.toHaveBeenCalled();
    });

    it('Given: custom role belonging to different org When: getting role permissions Then: should return NotFoundError', async () => {
      // Arrange
      const roleFromOtherOrg = Role.reconstitute(
        { name: 'OTHER_ROLE', isActive: true, isSystem: false },
        mockRoleId,
        'other-org-id'
      );
      mockRoleRepository.findById.mockResolvedValue(roleFromOtherOrg);

      // Act
      const result = await useCase.execute({ roleId: mockRoleId, orgId: mockOrgId });

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
      expect(mockPrismaService.rolePermission.findMany).not.toHaveBeenCalled();
    });
  });
});
