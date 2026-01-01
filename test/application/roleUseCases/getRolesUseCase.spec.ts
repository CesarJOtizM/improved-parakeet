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
  });
});
