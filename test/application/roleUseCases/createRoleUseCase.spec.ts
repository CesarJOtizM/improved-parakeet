import { CreateRoleUseCase } from '@application/roleUseCases/createRoleUseCase';
import { Role } from '@auth/domain/entities/role.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { IRoleRepository } from '@auth/domain/repositories';

describe('CreateRoleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleId = 'role-123';
  const mockCreatedBy = 'admin-123';

  let useCase: CreateRoleUseCase;
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

    useCase = new CreateRoleUseCase(mockRoleRepository);
  });

  describe('execute', () => {
    const validRequest = {
      name: 'CUSTOM_ROLE',
      description: 'Custom role description',
      orgId: mockOrgId,
      createdBy: mockCreatedBy,
    };

    it('Given: valid role data When: creating role Then: should return success result', async () => {
      // Arrange
      mockRoleRepository.findByName.mockResolvedValue(null);
      const roleProps = {
        name: 'CUSTOM_ROLE',
        description: 'Custom role description',
        isActive: true,
        isSystem: false,
      };
      const roleWithId = Role.reconstitute(roleProps, mockRoleId, mockOrgId);
      mockRoleRepository.save.mockResolvedValue(roleWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Role created successfully');
          expect(value.data.id).toBe(mockRoleId);
          expect(value.data.name).toBe('CUSTOM_ROLE');
          expect(value.data.isSystem).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('CUSTOM_ROLE');
      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('CUSTOM_ROLE', mockOrgId);
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: role name too short When: creating role Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        name: 'AB',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('at least 3 characters');
        }
      );
    });

    it('Given: role name too long When: creating role Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        name: 'A'.repeat(51),
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('not exceed 50 characters');
        }
      );
    });

    it('Given: duplicate system role name When: creating role Then: should return ConflictError', async () => {
      // Arrange
      const systemRole = Role.reconstitute(
        {
          name: 'CUSTOM_ROLE',
          isActive: true,
          isSystem: true,
        },
        'system-role-id',
        undefined
      );
      mockRoleRepository.findByName.mockResolvedValue(systemRole);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists as a system role');
        }
      );
    });

    it('Given: duplicate custom role name When: creating role Then: should return ConflictError', async () => {
      // Arrange
      const existingRole = Role.reconstitute(
        {
          name: 'CUSTOM_ROLE',
          isActive: true,
          isSystem: false,
        },
        'existing-role-id',
        mockOrgId
      );
      mockRoleRepository.findByName.mockResolvedValueOnce(null);
      mockRoleRepository.findByName.mockResolvedValueOnce(existingRole);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists in this organization');
        }
      );
    });
  });
});
