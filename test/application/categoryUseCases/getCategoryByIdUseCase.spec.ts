import { GetCategoryByIdUseCase } from '@application/categoryUseCases/getCategoryByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';

describe('GetCategoryByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockCategoryId = 'cat-123';

  let useCase: GetCategoryByIdUseCase;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCategoryRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      findByParentId: jest.fn(),
      findRootCategories: jest.fn(),
      existsByName: jest.fn(),
    } as jest.Mocked<ICategoryRepository>;

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    useCase = new GetCategoryByIdUseCase(mockCategoryRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockCategory = (
      overrides: Partial<{
        name: string;
        id: string;
        parentId: string;
        description: string;
        isActive: boolean;
      }> = {}
    ): Category => {
      return Category.reconstitute(
        {
          name: overrides.name ?? 'Electronics',
          description: overrides.description ?? 'Electronic devices',
          parentId: overrides.parentId,
          isActive: overrides.isActive ?? true,
        },
        overrides.id ?? mockCategoryId,
        mockOrgId
      );
    };

    it('Given: existing category without parent When: getting by id Then: should return success result', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Category retrieved successfully');
          expect(value.data.id).toBe(mockCategoryId);
          expect(value.data.name).toBe('Electronics');
          expect(value.data.description).toBe('Electronic devices');
          expect(value.data.isActive).toBe(true);
          expect(value.data.parentId).toBeUndefined();
          expect(value.data.parentName).toBeUndefined();
          expect(value.data.productCount).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: existing category with parent When: getting by id Then: should include parentName', async () => {
      // Arrange
      const parentCategory = createMockCategory({ name: 'Parent Category', id: 'parent-123' });
      const category = createMockCategory({ parentId: 'parent-123' });

      mockCategoryRepository.findById
        .mockResolvedValueOnce(category) // First call: findById for the category
        .mockResolvedValueOnce(parentCategory); // Second call: findById for the parent
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.parentId).toBe('parent-123');
          expect(value.data.parentName).toBe('Parent Category');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('Given: non-existent category When: getting by id Then: should return NotFoundError', async () => {
      // Arrange
      mockCategoryRepository.findById.mockResolvedValue(null);

      const request = {
        categoryId: 'non-existent-id',
        orgId: mockOrgId,
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
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Category not found');
        }
      );
    });

    it('Given: category with products When: getting by id Then: should return correct productCount', async () => {
      // Arrange
      const category = createMockCategory({ name: 'Electronics' });
      mockCategoryRepository.findById.mockResolvedValue(category);

      // Mock products where some have the category name
      const mockProducts = [
        { category: 'Electronics' },
        { category: 'Electronics' },
        { category: 'Clothing' },
      ] as unknown as ReturnType<typeof mockProductRepository.findAll> extends Promise<infer U>
        ? U
        : never;
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.productCount).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: category with parent that no longer exists When: getting by id Then: should return undefined parentName', async () => {
      // Arrange
      const category = createMockCategory({ parentId: 'deleted-parent' });

      mockCategoryRepository.findById
        .mockResolvedValueOnce(category) // First call: the category itself
        .mockResolvedValueOnce(null); // Second call: parent not found
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.parentId).toBe('deleted-parent');
          expect(value.data.parentName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: inactive category When: getting by id Then: should return category with isActive false', async () => {
      // Arrange
      const category = createMockCategory({ isActive: false });
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isActive).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: valid request When: getting by id Then: should call findById with correct params', async () => {
      // Arrange
      mockCategoryRepository.findById.mockResolvedValue(null);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(mockCategoryId, mockOrgId);
    });

    it('Given: category with no products When: getting by id Then: should return productCount 0', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.productCount).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findAll).toHaveBeenCalledWith(mockOrgId);
    });
  });
});
