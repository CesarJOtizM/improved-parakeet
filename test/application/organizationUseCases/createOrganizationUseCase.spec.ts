import { CreateOrganizationUseCase } from '@application/organizationUseCases/createOrganizationUseCase';
import { AuthSeed } from '@infrastructure/database/prisma/seeds/auth.seed';
import { InventorySeed } from '@infrastructure/database/prisma/seeds/inventory.seed';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { IOrganizationRepository } from '@organization/domain/repositories';

// Mock bcrypt module for dynamic import
jest.mock('bcrypt', () => {
  return {
    // @ts-expect-error - Mock function type inference issue
    hash: jest.fn().mockResolvedValue('$2b$12$mockedHashValue'),
    // @ts-expect-error - Mock function type inference issue
    compare: jest.fn().mockResolvedValue(true),
  };
});

describe('CreateOrganizationUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockOrganizationId = 'org-123';

  let useCase: CreateOrganizationUseCase;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrganizationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockPrismaService = {
      organization: {
        findUnique: jest.fn(),
      },
      user: {
        create: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    // Mock AuthSeed
    jest.spyOn(AuthSeed.prototype, 'seed').mockResolvedValue({
      roles: [
        {
          id: 'admin-role-id',
          name: 'ADMIN',
          description: null,
          isActive: true,
          orgId: mockOrgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      permissions: [],
      adminUser: {
        id: 'admin-user-id',
        email: 'admin@test.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashed',
        isActive: true,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Mock InventorySeed
    jest.spyOn(InventorySeed.prototype, 'seed').mockResolvedValue({
      warehouses: [],
      products: [],
    });

    useCase = new CreateOrganizationUseCase(mockOrganizationRepository, mockPrismaService);
  });

  describe('execute', () => {
    const validRequest = {
      name: 'Test Organization',
      slug: 'test-org',
      domain: 'test.example.com',
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
    };

    it('Given: valid organization data When: creating organization Then: should return success result', async () => {
      // Arrange
      mockOrganizationRepository.existsBySlug.mockResolvedValue(false);
      mockOrganizationRepository.existsByDomain.mockResolvedValue(false);

      const organizationProps = {
        name: validRequest.name,
        taxId: undefined,
        settings: {},
        timezone: validRequest.timezone,
        currency: validRequest.currency,
        dateFormat: validRequest.dateFormat,
        isActive: true,
      };
      const organizationWithId = Organization.reconstitute(
        organizationProps,
        mockOrganizationId,
        mockOrgId
      );
      mockOrganizationRepository.save.mockResolvedValue(organizationWithId);

      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrganizationId,
        name: validRequest.name,
        slug: validRequest.slug,
        domain: validRequest.domain,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Organization created successfully');
          expect(value.data.id).toBe(mockOrganizationId);
          expect(value.data.name).toBe(validRequest.name);
          expect(value.data.slug).toBe(validRequest.slug);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOrganizationRepository.existsBySlug).toHaveBeenCalledWith(validRequest.slug);
      expect(mockOrganizationRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: invalid slug format When: creating organization Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        slug: 'INVALID_SLUG',
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
          expect(error.message).toContain('lowercase letters');
        }
      );
    });

    it('Given: slug too short When: creating organization Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        slug: 'ab',
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
          expect(error.message).toContain('between 3 and 50 characters');
        }
      );
    });

    it('Given: duplicate slug When: creating organization Then: should return ConflictError', async () => {
      // Arrange
      mockOrganizationRepository.existsBySlug.mockResolvedValue(true);

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
          expect(error.message).toContain('already in use');
        }
      );
    });

    it('Given: duplicate domain When: creating organization Then: should return ConflictError', async () => {
      // Arrange
      mockOrganizationRepository.existsBySlug.mockResolvedValue(false);
      mockOrganizationRepository.existsByDomain.mockResolvedValue(true);

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
          expect(error.message).toContain('already in use');
        }
      );
    });

    it('Given: request with admin user When: creating organization Then: should create admin user', async () => {
      // Arrange
      mockOrganizationRepository.existsBySlug.mockResolvedValue(false);
      mockOrganizationRepository.existsByDomain.mockResolvedValue(false);

      const organizationProps = {
        name: validRequest.name,
        taxId: undefined,
        settings: {},
        timezone: validRequest.timezone,
        currency: validRequest.currency,
        dateFormat: validRequest.dateFormat,
        isActive: true,
      };
      const organizationWithId = Organization.reconstitute(
        organizationProps,
        mockOrganizationId,
        mockOrgId
      );
      mockOrganizationRepository.save.mockResolvedValue(organizationWithId);

      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrganizationId,
        name: validRequest.name,
        slug: validRequest.slug,
        domain: validRequest.domain,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'admin@test.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashed',
        isActive: true,
        orgId: mockOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const requestWithAdmin = {
        ...validRequest,
        adminUser: {
          email: 'admin@test.com',
          username: 'admin',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'User',
        },
      };

      // Act
      const result = await useCase.execute(requestWithAdmin);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.adminUser).toBeDefined();
          expect(value.adminUser?.email).toBe('admin@test.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });
});
