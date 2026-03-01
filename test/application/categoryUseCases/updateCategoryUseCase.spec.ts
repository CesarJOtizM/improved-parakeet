import { UpdateCategoryUseCase } from '@application/categoryUseCases/updateCategoryUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';

describe('UpdateCategoryUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockCategoryId = 'cat-123';

  let useCase: UpdateCategoryUseCase;
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

    useCase = new UpdateCategoryUseCase(mockCategoryRepository, mockProductRepository);
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

    it('Given: valid update data When: updating category name Then: should return success result', async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: 'Electronics' });
      const updatedCategory = createMockCategory({ name: 'Consumer Electronics' });
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockResolvedValue(updatedCategory);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'Consumer Electronics',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Category updated successfully');
          expect(value.data.name).toBe('Consumer Electronics');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent category When: updating category Then: should return NotFoundError', async () => {
      // Arrange
      mockCategoryRepository.findById.mockResolvedValue(null);

      const request = {
        categoryId: 'non-existent-id',
        orgId: mockOrgId,
        name: 'New Name',
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
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('Given: duplicate category name When: updating category Then: should return ConflictError', async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: 'Electronics' });
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(true);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'Clothing', // Name already taken by another category
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
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toBe('A category with this name already exists');
          expect(error.code).toBe('CATEGORY_NAME_CONFLICT');
        }
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('Given: same name as current When: updating category Then: should skip name uniqueness check', async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: 'Electronics' });
      const savedCategory = createMockCategory({
        name: 'Electronics',
        description: 'Updated description',
      });
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'Electronics', // Same name - should not check uniqueness
        description: 'Updated description',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCategoryRepository.existsByName).not.toHaveBeenCalled();
    });

    it('Given: self-referencing parentId When: updating category Then: should return ValidationError', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        parentId: mockCategoryId, // Self-reference
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
          expect(error.message).toBe('A category cannot be its own parent');
          expect(error.code).toBe('INVALID_PARENT');
        }
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('Given: non-existent parent category When: updating parentId Then: should return NotFoundError', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById
        .mockResolvedValueOnce(existingCategory) // First: find the category
        .mockResolvedValueOnce(null); // Second: find the parent (not found)

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        parentId: 'non-existent-parent',
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
          expect(error.message).toBe('Parent category not found');
        }
      );
    });

    it('Given: valid parentId When: updating category Then: should resolve parentName', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      const parentCategory = createMockCategory({ name: 'Parent', id: 'parent-123' });
      const savedCategory = createMockCategory({ parentId: 'parent-123' });

      mockCategoryRepository.findById
        .mockResolvedValueOnce(existingCategory) // First: find the category
        .mockResolvedValueOnce(parentCategory) // Second: validate parentId exists
        .mockResolvedValueOnce(parentCategory); // Third: resolve parentName after save
      mockCategoryRepository.save.mockResolvedValue(savedCategory);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        parentId: 'parent-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.parentName).toBe('Parent');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: partial update with only description When: updating category Then: should succeed', async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: 'Electronics' });
      const savedCategory = createMockCategory({
        name: 'Electronics',
        description: 'New description',
      });
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        description: 'New description',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.description).toBe('New description');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.existsByName).not.toHaveBeenCalled();
    });

    it('Given: Prisma P2002 error When: updating category Then: should return ConflictError', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'New Name',
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
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.code).toBe('CATEGORY_NAME_CONFLICT');
        }
      );
    });

    it('Given: Prisma P2003 error When: updating category Then: should return ValidationError', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Foreign key constraint'), { code: 'P2003' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'New Name',
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
          expect(error.code).toBe('INVALID_PARENT_CATEGORY');
        }
      );
    });

    it('Given: Prisma P2025 error When: updating category Then: should return NotFoundError', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'New Name',
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

    it('Given: unexpected repository error When: updating category Then: should return ValidationError with update error code', async () => {
      // Arrange
      const existingCategory = createMockCategory();
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockRejectedValue(new Error('Connection timeout'));

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        name: 'New Name',
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
          expect(error.code).toBe('CATEGORY_UPDATE_ERROR');
          expect(error.message).toContain('Connection timeout');
        }
      );
    });

    it('Given: update with isActive change When: updating category Then: should apply isActive change', async () => {
      // Arrange
      const existingCategory = createMockCategory({ isActive: true });
      const savedCategory = createMockCategory({ isActive: false });
      mockCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        categoryId: mockCategoryId,
        orgId: mockOrgId,
        isActive: false,
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
  });
});
