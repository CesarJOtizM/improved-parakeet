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
  });
});
