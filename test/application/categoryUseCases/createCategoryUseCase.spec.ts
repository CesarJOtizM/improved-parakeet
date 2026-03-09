import { CreateCategoryUseCase } from '@application/categoryUseCases/createCategoryUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';

describe('CreateCategoryUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: CreateCategoryUseCase;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;

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

    useCase = new CreateCategoryUseCase(mockCategoryRepository);
  });

  describe('execute', () => {
    const createMockCategory = (
      overrides: Partial<{ name: string; description: string; parentId: string }> = {}
    ): Category => {
      return Category.reconstitute(
        {
          name: overrides.name ?? 'Electronics',
          description: overrides.description ?? 'Electronic devices',
          parentId: overrides.parentId,
          isActive: true,
        },
        'cat-123',
        mockOrgId
      );
    };

    it('Given: valid category data When: creating category Then: should return success result', async () => {
      // Arrange
      const savedCategory = createMockCategory();
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);

      const request = {
        name: 'Electronics',
        description: 'Electronic devices',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Category created successfully');
          expect(value.data.name).toBe('Electronics');
          expect(value.data.description).toBe('Electronic devices');
          expect(value.data.isActive).toBe(true);
          expect(value.data.productCount).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.existsByName).toHaveBeenCalledWith('Electronics', mockOrgId);
      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: valid category data with parent When: creating category Then: should return success with parentName', async () => {
      // Arrange
      const parentCategory = createMockCategory({ name: 'Parent Category' });
      const savedCategory = createMockCategory({ parentId: 'parent-123' });
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.findById.mockResolvedValue(parentCategory);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);

      const request = {
        name: 'Electronics',
        description: 'Electronic devices',
        parentId: 'parent-123',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.parentName).toBe('Parent Category');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('parent-123', mockOrgId);
    });

    it('Given: duplicate category name When: creating category Then: should return ConflictError', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(true);

      const request = {
        name: 'Electronics',
        description: 'Electronic devices',
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
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toBe('A category with this name already exists');
        }
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('Given: non-existent parent category When: creating category Then: should return NotFoundError', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.findById.mockResolvedValue(null);

      const request = {
        name: 'Electronics',
        description: 'Electronic devices',
        parentId: 'non-existent-parent',
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
          expect(error.message).toBe('Parent category not found');
        }
      );
      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('Given: Prisma P2002 error When: creating category Then: should return ConflictError', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        name: 'Electronics',
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
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.code).toBe('CATEGORY_NAME_CONFLICT');
        }
      );
    });

    it('Given: Prisma P2003 error When: creating category Then: should return ValidationError', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Foreign key constraint'), { code: 'P2003' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        name: 'Electronics',
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
          expect(error.code).toBe('CATEGORY_INVALID_PARENT_REF');
        }
      );
    });

    it('Given: Prisma P2025 error When: creating category Then: should return NotFoundError', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockCategoryRepository.save.mockRejectedValue(prismaError);

      const request = {
        name: 'Electronics',
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
          expect(error.message).toBe('Referenced record not found');
        }
      );
    });

    it('Given: unexpected repository error When: creating category Then: should return ValidationError with creation error code', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockRejectedValue(new Error('Database connection lost'));

      const request = {
        name: 'Electronics',
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
          expect(error.code).toBe('CATEGORY_CREATION_ERROR');
          expect(error.message).toContain('Database connection lost');
        }
      );
    });

    it('Given: non-Error thrown When: creating category Then: should handle unknown error', async () => {
      // Arrange
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockRejectedValue('string-error');

      const request = {
        name: 'Electronics',
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
          expect(error.message).toContain('Unknown error');
        }
      );
    });

    it('Given: category without description When: creating category Then: should succeed with undefined description', async () => {
      // Arrange
      const savedCategory = createMockCategory({ description: undefined as unknown as string });
      mockCategoryRepository.existsByName.mockResolvedValue(false);
      mockCategoryRepository.save.mockResolvedValue(savedCategory);

      const request = {
        name: 'Electronics',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.name).toBe('Electronics');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
