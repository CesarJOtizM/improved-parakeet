/* eslint-disable @typescript-eslint/no-explicit-any */
import { RolesController } from '@interface/http/routes/roles.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from '@shared/domain/result/domainError';

describe('RolesController', () => {
  let controller: RolesController;
  let mockCreateRoleUseCase: any;
  let mockGetRolesUseCase: any;
  let mockGetRoleUseCase: any;
  let mockUpdateRoleUseCase: any;
  let mockDeleteRoleUseCase: any;
  let mockAssignPermissionsToRoleUseCase: any;
  let mockGetPermissionsUseCase: any;
  let mockGetRolePermissionsUseCase: any;

  const mockRequest = {
    user: { id: 'user-123', email: 'admin@test.com', orgId: 'org-123' },
  };

  const mockOrgId = 'org-123';

  const mockRoleData = {
    id: 'role-123',
    name: 'Custom Manager',
    description: 'Custom manager role',
    type: 'CUSTOM',
    isActive: true,
    orgId: mockOrgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockCreateRoleUseCase = { execute: jest.fn() };
    mockGetRolesUseCase = { execute: jest.fn() };
    mockGetRoleUseCase = { execute: jest.fn() };
    mockUpdateRoleUseCase = { execute: jest.fn() };
    mockDeleteRoleUseCase = { execute: jest.fn() };
    mockAssignPermissionsToRoleUseCase = { execute: jest.fn() };
    mockGetPermissionsUseCase = { execute: jest.fn() };
    mockGetRolePermissionsUseCase = { execute: jest.fn() };

    controller = new RolesController(
      mockCreateRoleUseCase,
      mockGetRolesUseCase,
      mockGetRoleUseCase,
      mockUpdateRoleUseCase,
      mockDeleteRoleUseCase,
      mockAssignPermissionsToRoleUseCase,
      mockGetPermissionsUseCase,
      mockGetRolePermissionsUseCase
    );
  });

  describe('createRole', () => {
    it('Given: valid role data When: creating Then: should return created role', async () => {
      // Arrange
      const dto = { name: 'Custom Manager', description: 'Custom manager role' };
      const createResponse = {
        success: true,
        data: mockRoleData,
        message: 'Role created',
        timestamp: new Date().toISOString(),
      };
      mockCreateRoleUseCase.execute.mockResolvedValue(ok(createResponse));

      // Act
      const result = await controller.createRole(dto as any, mockOrgId, mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Custom Manager');
      expect(mockCreateRoleUseCase.execute).toHaveBeenCalledWith({
        name: 'Custom Manager',
        description: 'Custom manager role',
        orgId: mockOrgId,
        createdBy: 'user-123',
      });
    });

    it('Given: duplicate role name When: creating Then: should throw', async () => {
      // Arrange
      const dto = { name: 'Existing Role' };
      mockCreateRoleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Role name already exists'))
      );

      // Act & Assert
      await expect(
        controller.createRole(dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getRoles', () => {
    it('Given: valid orgId When: getting roles Then: should return roles list', async () => {
      // Arrange
      const rolesResponse = {
        success: true,
        data: [mockRoleData],
        message: 'Roles retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetRolesUseCase.execute.mockResolvedValue(ok(rolesResponse));

      // Act
      const result = await controller.getRoles(mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGetRolesUseCase.execute).toHaveBeenCalledWith({ orgId: mockOrgId });
    });

    it('Given: use case error When: getting roles Then: should throw', async () => {
      // Arrange
      mockGetRolesUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve roles'))
      );

      // Act & Assert
      await expect(controller.getRoles(mockOrgId)).rejects.toThrow();
    });
  });

  describe('getPermissions', () => {
    it('Given: valid request When: getting permissions Then: should return all permissions', async () => {
      // Arrange
      const permissionsResponse = {
        success: true,
        data: {
          modules: [
            { name: 'USERS', permissions: ['USERS:CREATE', 'USERS:READ'] },
            { name: 'SALES', permissions: ['SALES:CREATE', 'SALES:READ'] },
          ],
        },
        message: 'Permissions retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetPermissionsUseCase.execute.mockResolvedValue(ok(permissionsResponse));

      // Act
      const result = await controller.getPermissions();

      // Assert
      expect(result.success).toBe(true);
      expect((result.data as any).modules).toHaveLength(2);
      expect(mockGetPermissionsUseCase.execute).toHaveBeenCalled();
    });

    it('Given: use case error When: getting permissions Then: should throw', async () => {
      // Arrange
      mockGetPermissionsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve permissions'))
      );

      // Act & Assert
      await expect(controller.getPermissions()).rejects.toThrow();
    });

    it('Given: use case rejects When: getting permissions Then: should propagate error', async () => {
      // Arrange
      mockGetPermissionsUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getPermissions()).rejects.toThrow('Database error');
    });
  });

  describe('getRole', () => {
    it('Given: valid role id When: getting role Then: should return role', async () => {
      // Arrange
      const roleResponse = {
        success: true,
        data: mockRoleData,
        message: 'Role retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetRoleUseCase.execute.mockResolvedValue(ok(roleResponse));

      // Act
      const result = await controller.getRole('role-123', mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('role-123');
      expect(mockGetRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        orgId: mockOrgId,
      });
    });

    it('Given: non-existent role When: getting role Then: should throw not found', async () => {
      // Arrange
      mockGetRoleUseCase.execute.mockResolvedValue(err(new NotFoundError('Role not found')));

      // Act & Assert
      await expect(controller.getRole('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    it('Given: valid update data When: updating role Then: should return updated role', async () => {
      // Arrange
      const dto = { description: 'Updated description', isActive: false };
      const updateResponse = {
        success: true,
        data: { ...mockRoleData, description: 'Updated description', isActive: false },
        message: 'Role updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateRoleUseCase.execute.mockResolvedValue(ok(updateResponse));

      // Act
      const result = await controller.updateRole(
        'role-123',
        dto as any,
        mockOrgId,
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        description: 'Updated description',
        isActive: false,
        orgId: mockOrgId,
        updatedBy: 'user-123',
      });
    });

    it('Given: system role When: updating Then: should throw business rule error', async () => {
      // Arrange
      const dto = { description: 'Cannot change' };
      mockUpdateRoleUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Cannot update system roles'))
      );

      // Act & Assert
      await expect(
        controller.updateRole('system-role', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: non-existent role When: updating Then: should throw not found', async () => {
      // Arrange
      const dto = { description: 'Update' };
      mockUpdateRoleUseCase.execute.mockResolvedValue(err(new NotFoundError('Role not found')));

      // Act & Assert
      await expect(
        controller.updateRole('non-existent', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('deleteRole', () => {
    it('Given: custom role When: deleting Then: should return success', async () => {
      // Arrange
      const deleteResponse = {
        success: true,
        message: 'Role deleted successfully',
        timestamp: new Date().toISOString(),
      };
      mockDeleteRoleUseCase.execute.mockResolvedValue(ok(deleteResponse));

      // Act
      const result = await controller.deleteRole('role-123', mockOrgId, mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeleteRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        orgId: mockOrgId,
        deletedBy: 'user-123',
      });
    });

    it('Given: system role When: deleting Then: should throw business rule error', async () => {
      // Arrange
      mockDeleteRoleUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Cannot delete system roles'))
      );

      // Act & Assert
      await expect(
        controller.deleteRole('system-role', mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: role assigned to users When: deleting Then: should throw', async () => {
      // Arrange
      mockDeleteRoleUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Role is assigned to users'))
      );

      // Act & Assert
      await expect(
        controller.deleteRole('role-123', mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: non-existent role When: deleting Then: should throw not found', async () => {
      // Arrange
      mockDeleteRoleUseCase.execute.mockResolvedValue(err(new NotFoundError('Role not found')));

      // Act & Assert
      await expect(
        controller.deleteRole('non-existent', mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: use case rejects When: deleting role Then: should propagate error', async () => {
      // Arrange
      mockDeleteRoleUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.deleteRole('role-123', mockOrgId, mockRequest as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getRolePermissions', () => {
    it('Given: valid role id When: getting role permissions Then: should return permissions', async () => {
      // Arrange
      const permissionsResponse = {
        success: true,
        data: {
          permissions: ['USERS:CREATE', 'USERS:READ', 'SALES:READ'],
        },
        message: 'Role permissions retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetRolePermissionsUseCase.execute.mockResolvedValue(ok(permissionsResponse));

      // Act
      const result = await controller.getRolePermissions('role-123', mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect((result.data as any).permissions).toHaveLength(3);
      expect(mockGetRolePermissionsUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        orgId: mockOrgId,
      });
    });

    it('Given: non-existent role When: getting permissions Then: should throw', async () => {
      // Arrange
      mockGetRolePermissionsUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Role not found'))
      );

      // Act & Assert
      await expect(controller.getRolePermissions('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('assignPermissionsToRole', () => {
    it('Given: valid permissions When: assigning Then: should return success', async () => {
      // Arrange
      const dto = { permissionIds: ['perm-1', 'perm-2', 'perm-3'] };
      const assignResponse = {
        success: true,
        data: { roleId: 'role-123', assignedPermissions: 3 },
        message: 'Permissions assigned',
        timestamp: new Date().toISOString(),
      };
      mockAssignPermissionsToRoleUseCase.execute.mockResolvedValue(ok(assignResponse));

      // Act
      const result = await controller.assignPermissionsToRole(
        'role-123',
        dto as any,
        mockOrgId,
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockAssignPermissionsToRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        permissionIds: ['perm-1', 'perm-2', 'perm-3'],
        orgId: mockOrgId,
        assignedBy: 'user-123',
      });
    });

    it('Given: invalid permission ids When: assigning Then: should throw', async () => {
      // Arrange
      const dto = { permissionIds: ['invalid-perm'] };
      mockAssignPermissionsToRoleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid permission IDs'))
      );

      // Act & Assert
      await expect(
        controller.assignPermissionsToRole('role-123', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: non-existent role When: assigning permissions Then: should throw not found', async () => {
      // Arrange
      const dto = { permissionIds: ['perm-1'] };
      mockAssignPermissionsToRoleUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Role not found'))
      );

      // Act & Assert
      await expect(
        controller.assignPermissionsToRole(
          'non-existent',
          dto as any,
          mockOrgId,
          mockRequest as any
        )
      ).rejects.toThrow();
    });

    it('Given: system role When: assigning permissions Then: should throw business rule error', async () => {
      // Arrange
      const dto = { permissionIds: ['perm-1'] };
      mockAssignPermissionsToRoleUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Cannot modify system role permissions'))
      );

      // Act & Assert
      await expect(
        controller.assignPermissionsToRole('system-role', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: empty permission list When: assigning Then: should pass empty array', async () => {
      // Arrange
      const dto = { permissionIds: [] };
      const assignResponse = {
        success: true,
        data: { roleId: 'role-123', assignedPermissions: 0 },
        message: 'Permissions assigned',
        timestamp: new Date().toISOString(),
      };
      mockAssignPermissionsToRoleUseCase.execute.mockResolvedValue(ok(assignResponse));

      // Act
      const result = await controller.assignPermissionsToRole(
        'role-123',
        dto as any,
        mockOrgId,
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockAssignPermissionsToRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        permissionIds: [],
        orgId: mockOrgId,
        assignedBy: 'user-123',
      });
    });
  });

  describe('createRole - no description branch', () => {
    it('Given: role with no description When: creating Then: should pass undefined description', async () => {
      // Arrange
      const dto = { name: 'Minimal Role' };
      const createResponse = {
        success: true,
        data: { ...mockRoleData, name: 'Minimal Role', description: undefined },
        message: 'Role created',
        timestamp: new Date().toISOString(),
      };
      mockCreateRoleUseCase.execute.mockResolvedValue(ok(createResponse));

      // Act
      const result = await controller.createRole(dto as any, mockOrgId, mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateRoleUseCase.execute).toHaveBeenCalledWith({
        name: 'Minimal Role',
        description: undefined,
        orgId: mockOrgId,
        createdBy: 'user-123',
      });
    });
  });

  describe('updateRole - partial fields', () => {
    it('Given: only description When: updating Then: should pass undefined isActive', async () => {
      // Arrange
      const dto = { description: 'Only description updated' };
      const updateResponse = {
        success: true,
        data: { ...mockRoleData, description: 'Only description updated' },
        message: 'Role updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateRoleUseCase.execute.mockResolvedValue(ok(updateResponse));

      // Act
      const result = await controller.updateRole(
        'role-123',
        dto as any,
        mockOrgId,
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        description: 'Only description updated',
        isActive: undefined,
        orgId: mockOrgId,
        updatedBy: 'user-123',
      });
    });

    it('Given: only isActive When: updating Then: should pass undefined description', async () => {
      // Arrange
      const dto = { isActive: true };
      const updateResponse = {
        success: true,
        data: { ...mockRoleData, isActive: true },
        message: 'Role updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateRoleUseCase.execute.mockResolvedValue(ok(updateResponse));

      // Act
      await controller.updateRole(
        'role-123',
        dto as any,
        mockOrgId,
        mockRequest as any
      );

      // Assert
      expect(mockUpdateRoleUseCase.execute).toHaveBeenCalledWith({
        roleId: 'role-123',
        description: undefined,
        isActive: true,
        orgId: mockOrgId,
        updatedBy: 'user-123',
      });
    });
  });

  describe('updateRole - validation error', () => {
    it('Given: validation failure When: updating Then: should throw validation error', async () => {
      // Arrange
      const dto = { description: '' };
      mockUpdateRoleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Description cannot be empty'))
      );

      // Act & Assert
      await expect(
        controller.updateRole('role-123', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('assignPermissionsToRole - use case rejects', () => {
    it('Given: use case rejects When: assigning permissions Then: should propagate error', async () => {
      // Arrange
      const dto = { permissionIds: ['perm-1'] };
      mockAssignPermissionsToRoleUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.assignPermissionsToRole('role-123', dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('createRole - additional branches', () => {
    it('Given: use case rejects When: creating role Then: should propagate error', async () => {
      // Arrange
      const dto = { name: 'New Role' };
      mockCreateRoleUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.createRole(dto as any, mockOrgId, mockRequest as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getRole - additional branches', () => {
    it('Given: use case rejects When: getting role Then: should propagate error', async () => {
      // Arrange
      mockGetRoleUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getRole('role-123', mockOrgId)).rejects.toThrow('Database error');
    });
  });

  describe('getRoles - additional branches', () => {
    it('Given: empty roles list When: getting roles Then: should return empty array', async () => {
      // Arrange
      const emptyResponse = {
        success: true,
        data: [],
        message: 'Roles retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetRolesUseCase.execute.mockResolvedValue(ok(emptyResponse));

      // Act
      const result = await controller.getRoles(mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getRolePermissions - additional branches', () => {
    it('Given: use case rejects When: getting role permissions Then: should propagate error', async () => {
      // Arrange
      mockGetRolePermissionsUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getRolePermissions('role-123', mockOrgId)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
