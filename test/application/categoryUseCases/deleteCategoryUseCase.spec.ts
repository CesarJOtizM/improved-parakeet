import { DeleteCategoryUseCase } from '@application/categoryUseCases/deleteCategoryUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';

describe('DeleteCategoryUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockCategoryId = 'cat-123';

  let useCase: DeleteCategoryUseCase;
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

    useCase = new DeleteCategoryUseCase(mockCategoryRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockCategory = (
      overrides: Partial<{ name: string; id: string }> = {}
    ): Category => {
      return Category.reconstitute(
        {
          name: overrides.name ?? 'Electronics',
          description: 'Electronic devices',
          isActive: true,
        },
        overrides.id ?? mockCategoryId,
        mockOrgId
      );
    };

    it('Given: existing category with no children and no products When: deleting category Then: should return success result', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([]);
      mockProductRepository.findAll.mockResolvedValue([]);
      mockCategoryRepository.delete.mockResolvedValue(undefined);

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
          expect(value.message).toBe('Category deleted successfully');
          expect(value.data.id).toBe(mockCategoryId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(mockCategoryId, mockOrgId);
    });

    it('Given: non-existent category When: deleting category Then: should return NotFoundError', async () => {
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
      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: category with subcategories When: deleting category Then: should return BusinessRuleError', async () => {
      // Arrange
      const category = createMockCategory();
      const childCategory = createMockCategory({ name: 'Laptops', id: 'child-cat-123' });
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([childCategory]);

      const request = {
        categoryId: mockCategoryId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('subcategories');
          expect(error.code).toBe('CATEGORY_HAS_CHILDREN');
        }
      );
      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: category with associated products When: deleting category Then: should return BusinessRuleError', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([]);

      // Create a mock product that has the category name
      const mockProduct = { category: 'Electronics' } as unknown as ReturnType<
        typeof mockProductRepository.findAll
      > extends Promise<(infer U)[]>
        ? U
        : never;
      mockProductRepository.findAll.mockResolvedValue([mockProduct]);

      const request = {
        categoryId: mockCategoryId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('associated products');
          expect(error.code).toBe('CATEGORY_HAS_PRODUCTS');
        }
      );
      expect(mockCategoryRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: category with multiple subcategories When: deleting category Then: should return BusinessRuleError', async () => {
      // Arrange
      const category = createMockCategory();
      const child1 = createMockCategory({ name: 'Laptops', id: 'child-1' });
      const child2 = createMockCategory({ name: 'Phones', id: 'child-2' });
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([child1, child2]);

      const request = {
        categoryId: mockCategoryId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.code).toBe('CATEGORY_HAS_CHILDREN');
        }
      );
    });

    it('Given: repository throws error When: deleting category Then: should return ValidationError', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([]);
      mockProductRepository.findAll.mockResolvedValue([]);
      mockCategoryRepository.delete.mockRejectedValue(new Error('Database error'));

      const request = {
        categoryId: mockCategoryId,
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
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.code).toBe('CATEGORY_DELETE_ERROR');
        }
      );
    });

    it('Given: category with no associated products When: deleting category Then: should verify product check was performed', async () => {
      // Arrange
      const category = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockCategoryRepository.findByParentId.mockResolvedValue([]);
      mockProductRepository.findAll.mockResolvedValue([]);
      mockCategoryRepository.delete.mockResolvedValue(undefined);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockProductRepository.findAll).toHaveBeenCalledWith(mockOrgId);
      expect(mockCategoryRepository.findByParentId).toHaveBeenCalledWith(mockCategoryId, mockOrgId);
    });

    it('Given: category exists When: deleting category Then: should call findById with correct params', async () => {
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
  });
});
