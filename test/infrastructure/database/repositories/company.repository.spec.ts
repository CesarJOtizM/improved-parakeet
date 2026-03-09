import { PrismaCompanyRepository } from '@infrastructure/database/repositories/company.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Company } from '@inventory/companies/domain/entities/company.entity';

describe('PrismaCompanyRepository', () => {
  let repository: PrismaCompanyRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    product: Record<string, jest.Mock<any>>;
  };

  const mockCompanyData = {
    id: 'comp-123',
    name: 'Acme Corp',
    code: 'ACME',
    description: 'A test company',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCompanyDataNoDescription = {
    id: 'comp-456',
    name: 'Beta Inc',
    code: 'BETA',
    description: null,
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      company: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaCompanyRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return company', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyData);

      // Act
      const result = await repository.findById('comp-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('comp-123');
      expect(result?.name).toBe('Acme Corp');
      expect(result?.code).toBe('ACME');
      expect(result?.description).toBe('A test company');
      expect(result?.isActive).toBe(true);
      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'comp-123', orgId: 'org-123' },
      });
    });

    it('Given: company with null description When: finding by id Then: should return company with undefined description', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyDataNoDescription);

      // Act
      const result = await repository.findById('comp-456', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('comp-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('comp-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return companies', async () => {
      // Arrange
      mockPrismaService.company.findMany.mockResolvedValue([
        mockCompanyData,
        mockCompanyDataNoDescription,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Acme Corp');
      expect(result[1].name).toBe('Beta Inc');
      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no companies When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.company.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: companies with null descriptions When: finding all Then: should map description to undefined', async () => {
      // Arrange
      mockPrismaService.company.findMany.mockResolvedValue([mockCompanyDataNoDescription]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding all Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.findMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string-error');
    });
  });

  describe('exists', () => {
    it('Given: existing company When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('comp-123', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.company.count).toHaveBeenCalledWith({
        where: { id: 'comp-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent company When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.exists('comp-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: checking existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.exists('comp-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('save', () => {
    it('Given: existing company When: saving Then: should update company', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompanyData);
      mockPrismaService.company.update.mockResolvedValue({
        ...mockCompanyData,
        name: 'Updated Acme',
      });

      const company = Company.reconstitute(
        {
          name: 'Updated Acme',
          code: 'ACME',
          description: 'A test company',
          isActive: true,
        },
        'comp-123',
        'org-123'
      );

      // Act
      const result = await repository.save(company);

      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('Updated Acme');
      expect(mockPrismaService.company.update).toHaveBeenCalled();
    });

    it('Given: new company When: saving Then: should create company', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.company.create.mockResolvedValue(mockCompanyData);

      const company = Company.reconstitute(
        {
          name: 'Acme Corp',
          code: 'ACME',
          description: 'A test company',
          isActive: true,
        },
        'comp-123',
        'org-123'
      );

      // Act
      const result = await repository.save(company);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.company.create).toHaveBeenCalled();
    });

    it('Given: company with no description When: saving Then: should save with null description', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.company.create.mockResolvedValue(mockCompanyDataNoDescription);

      const company = Company.reconstitute(
        {
          name: 'Beta Inc',
          code: 'BETA',
          isActive: true,
        },
        'comp-456',
        'org-123'
      );

      // Act
      const result = await repository.save(company);

      // Assert
      expect(result).not.toBeNull();
      expect(result.description).toBeUndefined();
      expect(mockPrismaService.company.create).toHaveBeenCalledWith({
        data: {
          id: 'comp-456',
          name: 'Beta Inc',
          code: 'BETA',
          description: null,
          isActive: true,
          orgId: 'org-123',
        },
      });
    });

    it('Given: existing company with null description When: updating Then: should return company with undefined description', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockResolvedValue(mockCompanyDataNoDescription);
      mockPrismaService.company.update.mockResolvedValue(mockCompanyDataNoDescription);

      const company = Company.reconstitute(
        {
          name: 'Beta Inc',
          code: 'BETA',
          isActive: true,
        },
        'comp-456',
        'org-123'
      );

      // Act
      const result = await repository.save(company);

      // Assert
      expect(result).not.toBeNull();
      expect(result.description).toBeUndefined();
      expect(mockPrismaService.company.update).toHaveBeenCalled();
    });

    it('Given: prisma throws error When: saving Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockRejectedValue(new Error('DB Error'));

      const company = Company.reconstitute(
        {
          name: 'Acme Corp',
          code: 'ACME',
          description: 'A test company',
          isActive: true,
        },
        'comp-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(company)).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: saving Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.findUnique.mockRejectedValue('string-error');

      const company = Company.reconstitute(
        {
          name: 'Acme Corp',
          code: 'ACME',
          description: 'A test company',
          isActive: true,
        },
        'comp-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(company)).rejects.toBe('string-error');
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete company', async () => {
      // Arrange
      mockPrismaService.company.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('comp-123', 'org-123');

      // Assert
      expect(mockPrismaService.company.deleteMany).toHaveBeenCalledWith({
        where: { id: 'comp-123', orgId: 'org-123' },
      });
    });

    it('Given: prisma throws error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.deleteMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.delete('comp-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: deleting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.deleteMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.delete('comp-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByCode', () => {
    it('Given: valid code and orgId When: finding by code Then: should return company', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyData);

      // Act
      const result = await repository.findByCode('ACME', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.code).toBe('ACME');
      expect(result?.name).toBe('Acme Corp');
      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { code: 'ACME', orgId: 'org-123' },
      });
    });

    it('Given: non-existent code When: finding by code Then: should return null', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByCode('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: company with null description When: finding by code Then: should return company with undefined description', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyDataNoDescription);

      // Act
      const result = await repository.findByCode('BETA', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: prisma throws error When: finding by code Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByCode('ACME', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding by code Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findByCode('ACME', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByName', () => {
    it('Given: valid name and orgId When: finding by name Then: should return company', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyData);

      // Act
      const result = await repository.findByName('Acme Corp', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Acme Corp');
      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { name: 'Acme Corp', orgId: 'org-123' },
      });
    });

    it('Given: non-existent name When: finding by name Then: should return null', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByName('NonExistent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: company with null description When: finding by name Then: should return company with undefined description', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockResolvedValue(mockCompanyDataNoDescription);

      // Act
      const result = await repository.findByName('Beta Inc', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: prisma throws error When: finding by name Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByName('Acme Corp', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding by name Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findByName('Acme Corp', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('existsByCode', () => {
    it('Given: existing code When: checking code existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByCode('ACME', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.company.count).toHaveBeenCalledWith({
        where: { code: 'ACME', orgId: 'org-123' },
      });
    });

    it('Given: non-existent code When: checking code existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByCode('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking code existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.existsByCode('ACME', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: checking code existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.existsByCode('ACME', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('existsByName', () => {
    it('Given: existing name When: checking name existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByName('Acme Corp', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.company.count).toHaveBeenCalledWith({
        where: { name: 'Acme Corp', orgId: 'org-123' },
      });
    });

    it('Given: non-existent name When: checking name existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.company.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByName('NonExistent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking name existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.existsByName('Acme Corp', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: checking name existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.company.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.existsByName('Acme Corp', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('countProducts', () => {
    it('Given: company with products When: counting products Then: should return count', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(5);

      // Act
      const result = await repository.countProducts('comp-123', 'org-123');

      // Assert
      expect(result).toBe(5);
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { companyId: 'comp-123', orgId: 'org-123' },
      });
    });

    it('Given: company with no products When: counting products Then: should return zero', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await repository.countProducts('comp-123', 'org-123');

      // Assert
      expect(result).toBe(0);
    });

    it('Given: prisma throws error When: counting products Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.countProducts('comp-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: counting products Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.countProducts('comp-123', 'org-123')).rejects.toBe('string-error');
    });
  });
});
