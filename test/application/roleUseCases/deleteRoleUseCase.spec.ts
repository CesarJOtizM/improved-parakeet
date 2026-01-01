import { DeleteRoleUseCase } from '@application/roleUseCases/deleteRoleUseCase';
import { Role, type IRoleProps } from '@auth/domain/entities/role.entity';
import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('DeleteRoleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleId = 'role-123';
  const mockDeletedBy = 'admin-123';

  let useCase: DeleteRoleUseCase;
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
      userRole: {
        count: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new DeleteRoleUseCase(mockRoleRepository, mockPrismaService);
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

    it('Given: valid custom role When: deleting role Then: should return success result', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      jest.spyOn(RoleAssignmentService, 'canDeleteRole').mockReturnValue({
        isValid: true,
        errors: [],
        canAssign: true,
      });
      mockPrismaService.userRole.count.mockResolvedValue(0);
      mockPrismaService.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockRoleRepository.delete.mockResolvedValue(undefined);

      const request = {
        roleId: mockRoleId,
        orgId: mockOrgId,
        deletedBy: mockDeletedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Role deleted successfully');
          expect(value.data.roleId).toBe(mockRoleId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockPrismaService.userRole.count).toHaveBeenCalledWith({
        where: {
          roleId: mockRoleId,
          orgId: mockOrgId,
        },
      });
      expect(mockRoleRepository.delete).toHaveBeenCalledWith(mockRoleId, mockOrgId);
    });

    it('Given: non-existent role id When: deleting role Then: should return NotFoundError', async () => {
      // Arrange
      mockRoleRepository.findById.mockResolvedValue(null);

      const request = {
        roleId: 'non-existent-id',
        orgId: mockOrgId,
        deletedBy: mockDeletedBy,
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

    it('Given: system role When: deleting role Then: should return BusinessRuleError', async () => {
      // Arrange
      const systemRole = Role.reconstitute(
        {
          name: 'ADMIN',
          isActive: true,
          isSystem: true,
        },
        'system-role-id',
        undefined
      );
      mockRoleRepository.findById.mockResolvedValue(systemRole);
      jest.spyOn(RoleAssignmentService, 'canDeleteRole').mockReturnValue({
        isValid: false,
        errors: ['Cannot delete system role'],
        canAssign: false,
      });

      const request = {
        roleId: 'system-role-id',
        orgId: mockOrgId,
        deletedBy: mockDeletedBy,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Cannot delete role');
        }
      );
    });

    it('Given: role assigned to users When: deleting role Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      jest.spyOn(RoleAssignmentService, 'canDeleteRole').mockReturnValue({
        isValid: true,
        errors: [],
        canAssign: true,
      });
      mockPrismaService.userRole.count.mockResolvedValue(2);

      const request = {
        roleId: mockRoleId,
        orgId: mockOrgId,
        deletedBy: mockDeletedBy,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('assigned to');
        }
      );
    });

    it('Given: role from different org When: deleting role Then: should return NotFoundError', async () => {
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
      jest.spyOn(RoleAssignmentService, 'canDeleteRole').mockReturnValue({
        isValid: true,
        errors: [],
        canAssign: true,
      });

      const request = {
        roleId: 'other-role-id',
        orgId: mockOrgId,
        deletedBy: mockDeletedBy,
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
  });
});
