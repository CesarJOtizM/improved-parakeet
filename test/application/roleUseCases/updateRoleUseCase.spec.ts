import { UpdateRoleUseCase } from '@application/roleUseCases/updateRoleUseCase';
import { Role, type IRoleProps } from '@auth/domain/entities/role.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('UpdateRoleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleId = 'role-123';
  const mockUpdatedBy = 'admin-123';

  let useCase: UpdateRoleUseCase;
  let mockRoleRepository: jest.Mocked<IRoleRepository>;

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

    useCase = new UpdateRoleUseCase(mockRoleRepository);
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
      const role = Role.reconstitute(props, mockRoleId, mockOrgId);
      role.update = jest.fn().mockReturnValue(role);
      return role;
    };

    it('Given: valid role update When: updating role Then: should return success result', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      const updatedRole = createMockRole({ description: 'Updated description', isActive: false });
      mockRoleRepository.save.mockResolvedValue(updatedRole);

      const request = {
        roleId: mockRoleId,
        description: 'Updated description',
        isActive: false,
        orgId: mockOrgId,
        updatedBy: mockUpdatedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Role updated successfully');
          expect(value.data.id).toBe(mockRoleId);
          expect(value.data.description).toBe('Updated description');
          expect(value.data.isActive).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRole.update).toHaveBeenCalledWith({
        description: 'Updated description',
        isActive: false,
      });
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent role id When: updating role Then: should return NotFoundError', async () => {
      // Arrange
      mockRoleRepository.findById.mockResolvedValue(null);

      const request = {
        roleId: 'non-existent-id',
        orgId: mockOrgId,
        updatedBy: mockUpdatedBy,
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

    it('Given: system role When: updating role Then: should return BusinessRuleError', async () => {
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

      const request = {
        roleId: 'system-role-id',
        description: 'Updated description',
        orgId: mockOrgId,
        updatedBy: mockUpdatedBy,
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
          expect(error.message).toContain('Cannot update system roles');
        }
      );
    });

    it('Given: role from different org When: updating role Then: should return NotFoundError', async () => {
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
        description: 'Updated description',
        orgId: mockOrgId,
        updatedBy: mockUpdatedBy,
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

    it('Given: description too long When: updating role Then: should return ValidationError', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);

      const request = {
        roleId: mockRoleId,
        description: 'A'.repeat(501),
        orgId: mockOrgId,
        updatedBy: mockUpdatedBy,
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
          expect(error.message).toContain('not exceed 500 characters');
        }
      );
    });
  });
});
