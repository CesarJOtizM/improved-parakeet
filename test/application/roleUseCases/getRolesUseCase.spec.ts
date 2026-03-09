import { GetRolesUseCase } from '@application/roleUseCases/getRolesUseCase';
import { Role, type IRoleProps } from '@auth/domain/entities/role.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('GetRolesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetRolesUseCase;
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

    useCase = new GetRolesUseCase(mockRoleRepository);
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
      return Role.reconstitute(props, 'role-123', mockOrgId);
    };

    it('Given: valid orgId When: getting roles Then: should return list of roles', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({ name: 'ADMIN', isSystem: true }),
        createMockRole({ name: 'CUSTOM_ROLE', isSystem: false }),
      ];
      mockRoleRepository.findAvailableRolesForOrganization.mockResolvedValue(mockRoles);

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
          expect(value.data).toHaveLength(2);
          expect(value.data[0].name).toBe('ADMIN');
          expect(value.data[1].name).toBe('CUSTOM_ROLE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRoleRepository.findAvailableRolesForOrganization).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: missing orgId When: getting roles Then: should return ValidationError', async () => {
      // Arrange
      const request = {
        orgId: '',
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
          expect(error.message).toContain('Organization ID is required');
        }
      );
    });

    it('Given: empty roles list When: getting roles Then: should return empty array', async () => {
      // Arrange
      mockRoleRepository.findAvailableRolesForOrganization.mockResolvedValue([]);

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
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: system role When: getting roles Then: should include isSystem true and correct fields', async () => {
      // Arrange
      const systemRole = createMockRole({
        name: 'SUPER_ADMIN',
        description: 'System admin role',
        isActive: true,
        isSystem: true,
      });
      mockRoleRepository.findAvailableRolesForOrganization.mockResolvedValue([systemRole]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].isSystem).toBe(true);
          expect(value.data[0].name).toBe('SUPER_ADMIN');
          expect(value.data[0].description).toBe('System admin role');
          expect(value.data[0].isActive).toBe(true);
          expect(value.data[0].orgId).toBeDefined();
          expect(value.data[0].createdAt).toBeDefined();
          expect(value.data[0].updatedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: role without description When: getting roles Then: should return undefined description', async () => {
      // Arrange
      const roleNoDesc = createMockRole({ name: 'BASIC', description: undefined });
      mockRoleRepository.findAvailableRolesForOrganization.mockResolvedValue([roleNoDesc]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].description).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: mix of system and custom roles When: getting roles Then: should return all roles with correct isSystem values', async () => {
      // Arrange
      const mockRoles = [
        createMockRole({ name: 'ADMIN', isSystem: true }),
        createMockRole({ name: 'EDITOR', isSystem: false }),
        createMockRole({ name: 'VIEWER', isSystem: true }),
      ];
      mockRoleRepository.findAvailableRolesForOrganization.mockResolvedValue(mockRoles);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(3);
          expect(value.data[0].isSystem).toBe(true);
          expect(value.data[1].isSystem).toBe(false);
          expect(value.data[2].isSystem).toBe(true);
          expect(value.message).toBe('Roles retrieved successfully');
          expect(value.timestamp).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
