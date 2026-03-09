import { UpdateOrganizationUseCase } from '@application/organizationUseCases/updateOrganizationUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IOrganizationRepository } from '@organization/domain/repositories';

describe('UpdateOrganizationUseCase', () => {
  const organizationId = 'org-123';

  let useCase: UpdateOrganizationUseCase;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const baseOrganization = Organization.reconstitute(
    {
      name: 'Original Org',
      settings: {},
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      isActive: true,
    },
    organizationId,
    organizationId
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrganizationRepository = {
      create: jest.fn(),
      update: jest.fn(),
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
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new UpdateOrganizationUseCase(mockOrganizationRepository, mockPrismaService);
  });

  describe('execute', () => {
    it('Given: organization not found When: updating Then: should return NotFoundError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({ id: organizationId, name: 'Updated' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
        }
      );
    });

    it('Given: organization missing in database When: updating Then: should return NotFoundError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({ id: organizationId, name: 'Updated' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
        }
      );
    });

    it('Given: invalid slug format When: updating Then: should return ValidationError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        slug: 'original',
        domain: 'original.com',
      });

      // Act
      const result = await useCase.execute({ id: organizationId, slug: 'INVALID_SLUG' });

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

    it('Given: slug length out of range When: updating Then: should return ValidationError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        slug: 'original',
        domain: 'original.com',
      });

      // Act
      const result = await useCase.execute({ id: organizationId, slug: 'ab' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });

    it('Given: slug already exists When: updating Then: should return ConflictError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        slug: 'original',
        domain: 'original.com',
      });
      mockOrganizationRepository.existsBySlug.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({ id: organizationId, slug: 'taken-slug' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
        }
      );
    });

    it('Given: domain already exists When: updating Then: should return ConflictError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        slug: 'original',
        domain: 'original.com',
      });
      mockOrganizationRepository.existsByDomain.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({ id: organizationId, domain: 'taken.com' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
        }
      );
    });

    it('Given: valid update When: updating Then: should return success result', async () => {
      // Arrange
      const updatedOrganization = Organization.reconstitute(
        {
          name: 'Updated Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );

      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'updated-slug',
          domain: 'updated.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.existsBySlug.mockResolvedValue(false);
      mockOrganizationRepository.existsByDomain.mockResolvedValue(false);
      mockOrganizationRepository.update.mockResolvedValue(updatedOrganization);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        name: 'Updated Org',
        slug: 'updated-slug',
        domain: 'updated.com',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.id).toBe(organizationId);
          expect(value.data.slug).toBe('updated-slug');
          expect(value.data.domain).toBe('updated.com');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOrganizationRepository.update).toHaveBeenCalledTimes(1);
    });

    it('Given: slug too long (>50 chars) When: updating Then: should return ValidationError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        slug: 'original',
        domain: 'original.com',
      });

      // Act
      const result = await useCase.execute({
        id: organizationId,
        slug: 'a'.repeat(51),
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('between 3 and 50');
        }
      );
    });

    it('Given: same slug as current When: updating Then: should not check slug existence', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Updated Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'same-slug', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'same-slug',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        slug: 'same-slug',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      // existsBySlug should NOT be called since slug matches current
      expect(mockOrganizationRepository.existsBySlug).not.toHaveBeenCalled();
    });

    it('Given: same domain as current When: updating Then: should not check domain existence', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Updated Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'same.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'same.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        domain: 'same.com',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockOrganizationRepository.existsByDomain).not.toHaveBeenCalled();
    });

    it('Given: only timezone update When: updating Then: should update timezone only', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Original Org',
          settings: {},
          timezone: 'America/Bogota',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        timezone: 'America/Bogota',
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: only currency update When: updating Then: should update currency only', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Original Org',
          settings: {},
          timezone: 'UTC',
          currency: 'COP',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        currency: 'COP',
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: only dateFormat update When: updating Then: should update dateFormat only', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Original Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'DD/MM/YYYY',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        dateFormat: 'DD/MM/YYYY',
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: isActive update When: updating Then: should update isActive', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Original Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: false,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({
        id: organizationId,
        isActive: false,
      });

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: no update props (no name/timezone/currency/dateFormat/isActive) When: updating Then: should not call organization.update', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Original Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: 'original.com',
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act - only id, no update fields
      const result = await useCase.execute({ id: organizationId });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockOrganizationRepository.update).toHaveBeenCalledTimes(1);
    });

    it('Given: orgData not found after update When: updating Then: should return NotFoundError', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Updated Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: 'original.com' })
        .mockResolvedValueOnce(null); // Not found after update
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({ id: organizationId, name: 'Updated Org' });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('not found after update');
        }
      );
    });

    it('Given: domain without domain in orgData When: updating Then: should return undefined for domain', async () => {
      // Arrange
      const updatedOrg = Organization.reconstitute(
        {
          name: 'Updated Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        organizationId,
        organizationId
      );
      mockOrganizationRepository.findById.mockResolvedValue(baseOrganization);
      mockPrismaService.organization.findUnique
        .mockResolvedValueOnce({ slug: 'original', domain: null })
        .mockResolvedValueOnce({
          id: organizationId,
          slug: 'original',
          domain: null, // no domain
          updatedAt: new Date(),
        });
      mockOrganizationRepository.update.mockResolvedValue(updatedOrg);

      // Act
      const result = await useCase.execute({ id: organizationId, name: 'Updated Org' });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.domain).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
