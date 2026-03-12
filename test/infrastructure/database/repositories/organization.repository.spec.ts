import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrganizationRepository } from '@infrastructure/database/repositories/organization.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { organization: Record<string, jest.Mock<any>> };

  const mockOrgData = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    domain: 'test.example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      organization: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new OrganizationRepository(mockPrismaService as unknown as PrismaService);
  });

  describe('findById', () => {
    it('Given: valid id When: finding by id Then: should return organization', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrgData);

      // Act
      const result = await repository.findById('org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('org-123');
      expect(result?.name).toBe('Test Organization');
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findBySlug', () => {
    it('Given: valid slug When: finding by slug Then: should return organization', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrgData);

      // Act
      const result = await repository.findBySlug('test-org');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Organization');
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-org' },
      });
    });

    it('Given: non-existent slug When: finding by slug Then: should return null', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findBySlug('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by slug Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockRejectedValue(new Error('Slug lookup failed'));

      // Act & Assert
      await expect(repository.findBySlug('test-org')).rejects.toThrow('Slug lookup failed');
    });
  });

  describe('findByDomain', () => {
    it('Given: valid domain When: finding by domain Then: should return organization', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrgData);

      // Act
      const result = await repository.findByDomain('test.example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { domain: 'test.example.com' },
      });
    });

    it('Given: non-existent domain When: finding by domain Then: should return null', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByDomain('unknown.com');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by domain Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockRejectedValue(
        new Error('Domain lookup failed')
      );

      // Act & Assert
      await expect(repository.findByDomain('test.com')).rejects.toThrow('Domain lookup failed');
    });
  });

  describe('findActiveOrganizations', () => {
    it('Given: active organizations exist When: finding active Then: should return them', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrgData]);

      // Act
      const result = await repository.findActiveOrganizations();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('Given: no active organizations When: finding active Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findActiveOrganizations();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding active organizations Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findActiveOrganizations()).rejects.toThrow('Query failed');
    });
  });

  describe('existsBySlug', () => {
    it('Given: slug exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsBySlug('test-org');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: slug does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsBySlug('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking slug existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.existsBySlug('test-org')).rejects.toThrow('Count failed');
    });
  });

  describe('existsByDomain', () => {
    it('Given: domain exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByDomain('test.example.com');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: domain does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByDomain('unknown.com');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking domain existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.count.mockRejectedValue(new Error('Domain count failed'));

      // Act & Assert
      await expect(repository.existsByDomain('test.com')).rejects.toThrow('Domain count failed');
    });
  });

  describe('exists', () => {
    it('Given: id exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: id does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.count.mockRejectedValue(new Error('Existence check failed'));

      // Act & Assert
      await expect(repository.exists('org-123')).rejects.toThrow('Existence check failed');
    });
  });

  describe('countActiveOrganizations', () => {
    it('Given: active organizations exist When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaService.organization.count.mockResolvedValue(5);

      // Act
      const result = await repository.countActiveOrganizations();

      // Assert
      expect(result).toBe(5);
    });

    it('Given: database error When: counting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.count.mockRejectedValue(new Error('Count error'));

      // Act & Assert
      await expect(repository.countActiveOrganizations()).rejects.toThrow('Count error');
    });
  });

  describe('create', () => {
    it('Given: valid organization and slug When: creating Then: should create organization', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'New Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        undefined as any,
        undefined as any
      );
      mockPrismaService.organization.create.mockResolvedValue({
        ...mockOrgData,
        id: 'new-org-id',
        name: 'New Organization',
      });

      // Act
      const result = await repository.create(org, 'new-org', 'new.example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'New Organization',
          slug: 'new-org',
          domain: 'new.example.com',
          isActive: true,
        },
      });
    });

    it('Given: no slug When: creating Then: should throw error', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'New Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        undefined as any,
        undefined as any
      );

      // Act & Assert
      await expect(repository.create(org, '')).rejects.toThrow(
        'Slug is required when creating a new organization'
      );
    });

    it('Given: database error When: creating Then: should throw error', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'New Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        undefined as any,
        undefined as any
      );
      mockPrismaService.organization.create.mockRejectedValue(new Error('Create failed'));

      // Act & Assert
      await expect(repository.create(org, 'new-org')).rejects.toThrow('Create failed');
    });
  });

  describe('update', () => {
    it('Given: existing organization When: updating Then: should update organization', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'Updated Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        'org-123',
        'org-123'
      );
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrgData,
        name: 'Updated Organization',
      });

      // Act
      const result = await repository.update(org, 'updated-slug', 'updated.example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.organization.update).toHaveBeenCalled();
    });

    it('Given: organization without id When: updating Then: should throw error', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        undefined as any,
        undefined as any
      );

      // Act & Assert
      await expect(repository.update(org)).rejects.toThrow();
    });

    it('Given: database error When: updating Then: should throw error', async () => {
      // Arrange
      const org = Organization.reconstitute(
        {
          name: 'Organization',
          isActive: true,
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          settings: {},
        },
        'org-123',
        'org-123'
      );
      mockPrismaService.organization.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(repository.update(org)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('Given: existing organization When: deleting Then: should delete organization', async () => {
      // Arrange
      mockPrismaService.organization.delete.mockResolvedValue(mockOrgData);

      // Act
      await repository.delete('org-123');

      // Assert
      expect(mockPrismaService.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      });
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.delete.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findByIds', () => {
    it('Given: valid ids When: finding by ids Then: should return organizations', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrgData]);

      // Act
      const result = await repository.findByIds(['org-123', 'org-456']);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['org-123', 'org-456'] } },
      });
    });

    it('Given: no matching ids When: finding by ids Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByIds(['nonexistent']);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding by ids Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockRejectedValue(new Error('FindByIds failed'));

      // Act & Assert
      await expect(repository.findByIds(['org-123'])).rejects.toThrow('FindByIds failed');
    });
  });

  describe('findAll', () => {
    it('Given: organizations exist When: finding all Then: should return all organizations', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrgData]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalled();
    });

    it('Given: no organizations When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.organization.findMany.mockRejectedValue(new Error('FindAll failed'));

      // Act & Assert
      await expect(repository.findAll()).rejects.toThrow('FindAll failed');
    });
  });
});
