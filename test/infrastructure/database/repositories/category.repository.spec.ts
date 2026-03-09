import { PrismaCategoryRepository } from '@infrastructure/database/repositories/category.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';

describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category: Record<string, jest.Mock<any>>;
  };

  const mockCategoryData = {
    id: 'cat-123',
    name: 'Electronics',
    description: 'Electronic products',
    parentId: null,
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildCategoryData = {
    id: 'cat-456',
    name: 'Smartphones',
    description: 'Mobile phones',
    parentId: 'cat-123',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      category: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaCategoryRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return category', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategoryData);

      // Act
      const result = await repository.findById('cat-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('cat-123');
      expect(result?.name).toBe('Electronics');
      expect(result?.isActive).toBe(true);
      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('cat-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: non-Error thrown When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('cat-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return categories', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([
        mockCategoryData,
        mockChildCategoryData,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Electronics');
      expect(result[1].name).toBe('Smartphones');
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no categories When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('Given: existing category When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.category.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('cat-123', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.category.count).toHaveBeenCalledWith({
        where: { id: 'cat-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent category When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.category.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('Given: existing category When: saving Then: should update category', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryData);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategoryData,
        name: 'Updated Electronics',
      });

      const category = Category.reconstitute(
        {
          name: 'Updated Electronics',
          description: 'Electronic products',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('Updated Electronics');
      expect(mockPrismaService.category.update).toHaveBeenCalled();
    });

    it('Given: new category When: saving Then: should create category', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategoryData);

      const category = Category.reconstitute(
        {
          name: 'Electronics',
          description: 'Electronic products',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.category.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete category', async () => {
      // Arrange
      mockPrismaService.category.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('cat-123', 'org-123');

      // Assert
      expect(mockPrismaService.category.deleteMany).toHaveBeenCalledWith({
        where: { id: 'cat-123', orgId: 'org-123' },
      });
    });
  });

  describe('findByName', () => {
    it('Given: valid name and orgId When: finding by name Then: should return category', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategoryData);

      // Act
      const result = await repository.findByName('Electronics', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Electronics');
      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: 'Electronics', orgId: 'org-123' },
      });
    });

    it('Given: non-existent name When: finding by name Then: should return null', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByName('NonExistent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByParentId', () => {
    it('Given: valid parentId When: finding by parent Then: should return child categories', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([mockChildCategoryData]);

      // Act
      const result = await repository.findByParentId('cat-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Smartphones');
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { parentId: 'cat-123', orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findRootCategories', () => {
    it('Given: valid orgId When: finding root categories Then: should return categories without parent', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([mockCategoryData]);

      // Act
      const result = await repository.findRootCategories('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBeUndefined();
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { parentId: null, orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('existsByName', () => {
    it('Given: existing name When: checking name existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.category.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByName('Electronics', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.category.count).toHaveBeenCalledWith({
        where: { name: 'Electronics', orgId: 'org-123' },
      });
    });

    it('Given: non-existent name When: checking name existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.category.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByName('NonExistent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking name existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.category.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.existsByName('Electronics', 'org-123')).rejects.toThrow(
        'Count failed'
      );
    });

    it('Given: non-Error thrown When: checking name existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.existsByName('Electronics', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('parentId handling', () => {
    it('Given: category with parentId When: findById Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockChildCategoryData);

      // Act
      const result = await repository.findById('cat-456', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.parentId).toBe('cat-123');
    });

    it('Given: category with null parentId When: findById Then: should map parentId to undefined', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategoryData);

      // Act
      const result = await repository.findById('cat-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.parentId).toBeUndefined();
    });

    it('Given: category with null description When: findById Then: should map description to undefined', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue({
        ...mockCategoryData,
        description: null,
      });

      // Act
      const result = await repository.findById('cat-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: category with empty description When: findById Then: should map description to undefined', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue({
        ...mockCategoryData,
        description: '',
      });

      // Act
      const result = await repository.findById('cat-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });
  });

  describe('findAll with parentId mapping', () => {
    it('Given: categories with mixed parentIds When: findAll Then: should map correctly', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([
        mockCategoryData,
        mockChildCategoryData,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].parentId).toBeUndefined();
      expect(result[1].parentId).toBe('cat-123');
    });

    it('Given: categories with null descriptions When: findAll Then: should map descriptions to undefined', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([
        { ...mockCategoryData, description: null },
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('Given: database error When: findAll Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: non-Error thrown When: findAll Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string-error');
    });
  });

  describe('non-Error throws', () => {
    it('Given: non-Error thrown When: exists Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.count.mockRejectedValue('exists-error');

      // Act & Assert
      await expect(repository.exists('cat-123', 'org-123')).rejects.toBe('exists-error');
    });

    it('Given: non-Error thrown When: save Then: should propagate non-Error', async () => {
      // Arrange
      const category = Category.reconstitute(
        {
          name: 'Test',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );
      mockPrismaService.category.findUnique.mockRejectedValue('save-error');

      // Act & Assert
      await expect(repository.save(category)).rejects.toBe('save-error');
    });

    it('Given: non-Error thrown When: delete Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.deleteMany.mockRejectedValue('delete-error');

      // Act & Assert
      await expect(repository.delete('cat-123', 'org-123')).rejects.toBe('delete-error');
    });

    it('Given: non-Error thrown When: findByName Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockRejectedValue('name-error');

      // Act & Assert
      await expect(repository.findByName('Electronics', 'org-123')).rejects.toBe('name-error');
    });

    it('Given: non-Error thrown When: findByParentId Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue('parent-error');

      // Act & Assert
      await expect(repository.findByParentId('cat-123', 'org-123')).rejects.toBe('parent-error');
    });

    it('Given: non-Error thrown When: findRootCategories Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue('root-error');

      // Act & Assert
      await expect(repository.findRootCategories('org-123')).rejects.toBe('root-error');
    });
  });

  describe('findByName with description and parentId', () => {
    it('Given: found category has description When: findByName Then: should map description', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockCategoryData);

      // Act
      const result = await repository.findByName('Electronics', 'org-123');

      // Assert
      expect(result?.description).toBe('Electronic products');
    });

    it('Given: found category has null description When: findByName Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue({
        ...mockCategoryData,
        description: null,
      });

      // Act
      const result = await repository.findByName('Electronics', 'org-123');

      // Assert
      expect(result?.description).toBeUndefined();
    });

    it('Given: found category has parentId When: findByName Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockResolvedValue(mockChildCategoryData);

      // Act
      const result = await repository.findByName('Smartphones', 'org-123');

      // Assert
      expect(result?.parentId).toBe('cat-123');
    });

    it('Given: database error When: findByName Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findFirst.mockRejectedValue(new Error('Name lookup failed'));

      // Act & Assert
      await expect(repository.findByName('Electronics', 'org-123')).rejects.toThrow(
        'Name lookup failed'
      );
    });
  });

  describe('findByParentId details', () => {
    it('Given: no children found When: findByParentId Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByParentId('cat-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: children with null descriptions When: findByParentId Then: should map descriptions to undefined', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([
        { ...mockChildCategoryData, description: null },
      ]);

      // Act
      const result = await repository.findByParentId('cat-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('Given: database error When: findByParentId Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue(new Error('Parent lookup failed'));

      // Act & Assert
      await expect(repository.findByParentId('cat-123', 'org-123')).rejects.toThrow(
        'Parent lookup failed'
      );
    });
  });

  describe('findRootCategories details', () => {
    it('Given: no root categories When: findRootCategories Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findRootCategories('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: root categories with null descriptions When: findRootCategories Then: should map descriptions to undefined', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([
        { ...mockCategoryData, description: null },
      ]);

      // Act
      const result = await repository.findRootCategories('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('Given: database error When: findRootCategories Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockRejectedValue(new Error('Root lookup failed'));

      // Act & Assert
      await expect(repository.findRootCategories('org-123')).rejects.toThrow('Root lookup failed');
    });
  });

  describe('save with parentId and description', () => {
    it('Given: category with parentId When: save update Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(mockChildCategoryData);
      mockPrismaService.category.update.mockResolvedValue(mockChildCategoryData);

      const category = Category.reconstitute(
        {
          name: 'Smartphones',
          description: 'Mobile phones',
          parentId: 'cat-123',
          isActive: true,
        },
        'cat-456',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result.parentId).toBe('cat-123');
    });

    it('Given: category with null description When: save update Then: should map description to undefined', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategoryData);
      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategoryData,
        description: null,
      });

      const category = Category.reconstitute(
        {
          name: 'Electronics',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result.description).toBeUndefined();
    });

    it('Given: category with null parentId When: save create Then: should map parentId to undefined', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({
        ...mockCategoryData,
        parentId: null,
      });

      const category = Category.reconstitute(
        {
          name: 'Electronics',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result.parentId).toBeUndefined();
    });

    it('Given: category with null description When: save create Then: should map description to undefined', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({
        ...mockCategoryData,
        description: null,
      });

      const category = Category.reconstitute(
        {
          name: 'Electronics',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act
      const result = await repository.save(category);

      // Assert
      expect(result.description).toBeUndefined();
    });

    it('Given: database error When: save Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.findUnique.mockRejectedValue(new Error('Save failed'));

      const category = Category.reconstitute(
        {
          name: 'Electronics',
          isActive: true,
        },
        'cat-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(category)).rejects.toThrow('Save failed');
    });
  });

  describe('exists error paths', () => {
    it('Given: database error When: exists Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.count.mockRejectedValue(new Error('Exists failed'));

      // Act & Assert
      await expect(repository.exists('cat-123', 'org-123')).rejects.toThrow('Exists failed');
    });
  });

  describe('delete error paths', () => {
    it('Given: database error When: delete Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.category.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('cat-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });
});
