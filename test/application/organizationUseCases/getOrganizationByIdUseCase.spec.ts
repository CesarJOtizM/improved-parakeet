import { GetOrganizationByIdUseCase } from '@application/organizationUseCases/getOrganizationByIdUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IOrganizationRepository } from '@organization/domain/ports/repositories';

describe('GetOrganizationByIdUseCase', () => {
  const cuidId = 'c123456789012345678901234';

  let useCase: GetOrganizationByIdUseCase;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    mockOrganizationRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockPrismaService = {
      organization: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetOrganizationByIdUseCase(mockOrganizationRepository, mockPrismaService);
  });

  it('Given: id identifier When: organization exists Then: should return success result', async () => {
    // Arrange
    const organization = Organization.reconstitute(
      {
        name: 'Org Name',
        settings: {},
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        isActive: true,
      },
      cuidId,
      cuidId
    );

    mockOrganizationRepository.findById.mockResolvedValue(organization);
    mockPrismaService.organization.findUnique.mockResolvedValue({
      slug: 'org-slug',
      domain: 'org.example.com',
    } as any);

    // Act
    const result = await useCase.execute({ identifier: cuidId });

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.id).toBe(cuidId);
        expect(value.data.slug).toBe('org-slug');
        expect(value.data.domain).toBe('org.example.com');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: id not found When: slug exists Then: should return organization by slug', async () => {
    // Arrange
    const organization = Organization.reconstitute(
      {
        name: 'Org Name',
        settings: {},
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        isActive: true,
      },
      'org-123',
      'org-123'
    );

    mockOrganizationRepository.findById.mockResolvedValue(null);
    mockOrganizationRepository.findBySlug.mockResolvedValue(organization);
    mockPrismaService.organization.findUnique.mockResolvedValue({
      slug: 'org-123',
      domain: null,
    } as any);

    // Act
    const result = await useCase.execute({ identifier: cuidId });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(cuidId);
  });

  it('Given: organization not found When: executing Then: should return NotFoundError', async () => {
    // Arrange
    mockOrganizationRepository.findById.mockResolvedValue(null);
    mockOrganizationRepository.findBySlug.mockResolvedValue(null);

    // Act
    const result = await useCase.execute({ identifier: 'missing-org' });

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
});
