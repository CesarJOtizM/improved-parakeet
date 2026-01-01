import { GetRoleUseCase } from '@application/roleUseCases/getRoleUseCase';
import { Role, type IRoleProps } from '@auth/domain/entities/role.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('GetRoleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleId = 'role-123';

  let useCase: GetRoleUseCase;
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

    useCase = new GetRoleUseCase(mockRoleRepository);
  });

  describe('execute', () => {
    const createMockRole = (overrides?: Partial<IRoleProps>): Role => {
      const props: IRoleProps = {
        name: 'TEST_ROLE',
        description: 'Test role',
        isActive: true,
        isSystem: false,
        ...overrides,
      };
      return Role.reconstitute(props, mockRoleId, mockOrgId);
    };

    it('Given: valid role id and orgId When: getting role Then: should return role', async () => {
      // Arrange
      const mockRole = createMockRole();
      mockRoleRepository.findById.mockResolvedValue(mockRole);

      const request = {
        roleId: mockRoleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.id).toBe(mockRoleId);
          expect(value.data.name).toBe('TEST_ROLE');
          expect(value.data.isSystem).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(mockRoleId);
    });

    it('Given: system role When: getting role Then: should return system role', async () => {
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
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.isSystem).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent role id When: getting role Then: should return NotFoundError', async () => {
      // Arrange
      mockRoleRepository.findById.mockResolvedValue(null);

      const request = {
        roleId: 'non-existent-id',
        orgId: mockOrgId,
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

    it('Given: custom role from different org When: getting role Then: should return NotFoundError', async () => {
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
        orgId: mockOrgId,
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
