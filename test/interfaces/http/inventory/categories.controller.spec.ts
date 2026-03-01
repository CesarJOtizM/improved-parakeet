/* eslint-disable @typescript-eslint/no-explicit-any */
import { CategoriesController } from '@interface/http/inventory/categories.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '@shared/domain/result/domainError';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let mockGetCategoriesUseCase: any;
  let mockGetCategoryByIdUseCase: any;
  let mockCreateCategoryUseCase: any;
  let mockUpdateCategoryUseCase: any;
  let mockDeleteCategoryUseCase: any;

  const mockCategoryData = {
    id: 'cat-123',
    name: 'Electronics',
    description: 'Electronic products',
    parentId: null,
    isActive: true,
    productCount: 5,
    orgId: 'org-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetCategoriesUseCase = { execute: jest.fn() };
    mockGetCategoryByIdUseCase = { execute: jest.fn() };
    mockCreateCategoryUseCase = { execute: jest.fn() };
    mockUpdateCategoryUseCase = { execute: jest.fn() };
    mockDeleteCategoryUseCase = { execute: jest.fn() };

    controller = new CategoriesController(
      mockGetCategoriesUseCase,
      mockGetCategoryByIdUseCase,
      mockCreateCategoryUseCase,
      mockUpdateCategoryUseCase,
      mockDeleteCategoryUseCase
    );
  });

  describe('getCategories', () => {
    it('Given: valid query params When: getting categories Then: should return categories list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [mockCategoryData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Categories retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetCategoriesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getCategories(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Electronics');
    });

    it('Given: search filter When: getting categories Then: should pass search to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, search: 'elec' };
      mockGetCategoriesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockCategoryData],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getCategories(query as any, 'org-123');

      // Assert
      expect(mockGetCategoriesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123', search: 'elec' })
      );
    });

    it('Given: parentId filter When: getting categories Then: should pass parentId to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, parentId: 'parent-1' };
      mockGetCategoriesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getCategories(query as any, 'org-123');

      // Assert
      expect(mockGetCategoriesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'parent-1' })
      );
    });
  });

  describe('getCategoryById', () => {
    it('Given: valid category id When: getting category Then: should return category', async () => {
      // Arrange
      mockGetCategoryByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockCategoryData,
          message: 'Category retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getCategoryById('cat-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('cat-123');
      expect(result.data.name).toBe('Electronics');
    });

    it('Given: non-existent category id When: getting category Then: should throw NotFoundException', async () => {
      // Arrange
      mockGetCategoryByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Category not found'))
      );

      // Act & Assert
      await expect(controller.getCategoryById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('createCategory', () => {
    it('Given: valid category data When: creating category Then: should return created category', async () => {
      // Arrange
      const dto = { name: 'Electronics', description: 'Electronic products' };
      mockCreateCategoryUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockCategoryData,
          message: 'Category created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createCategory(dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Electronics');
    });

    it('Given: category with parentId When: creating Then: should pass parentId to use case', async () => {
      // Arrange
      const dto = { name: 'Laptops', description: 'Laptop computers', parentId: 'cat-parent' };
      mockCreateCategoryUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockCategoryData, parentId: 'cat-parent' },
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createCategory(dto as any, 'org-123');

      // Assert
      expect(mockCreateCategoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Laptops', parentId: 'cat-parent', orgId: 'org-123' })
      );
    });

    it('Given: invalid data When: creating category Then: should throw ValidationError', async () => {
      // Arrange
      const dto = { name: '' };
      mockCreateCategoryUseCase.execute.mockResolvedValue(
        err(new ValidationError('Category name is required'))
      );

      // Act & Assert
      await expect(controller.createCategory(dto as any, 'org-123')).rejects.toThrow();
    });

    it('Given: duplicate category name When: creating Then: should throw ConflictError', async () => {
      // Arrange
      const dto = { name: 'Electronics' };
      mockCreateCategoryUseCase.execute.mockResolvedValue(
        err(new ConflictError('Category name already exists'))
      );

      // Act & Assert
      await expect(controller.createCategory(dto as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('updateCategory', () => {
    it('Given: valid update data When: updating category Then: should return updated category', async () => {
      // Arrange
      const dto = { name: 'Updated Electronics', description: 'Updated description' };
      mockUpdateCategoryUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockCategoryData, name: 'Updated Electronics' },
          message: 'Category updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateCategory('cat-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Electronics');
    });

    it('Given: isActive toggle When: updating category Then: should pass isActive to use case', async () => {
      // Arrange
      const dto = { isActive: false };
      mockUpdateCategoryUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockCategoryData, isActive: false },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateCategory('cat-123', dto as any, 'org-123');

      // Assert
      expect(mockUpdateCategoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-123', orgId: 'org-123', isActive: false })
      );
    });

    it('Given: non-existent category When: updating Then: should throw NotFoundError', async () => {
      // Arrange
      const dto = { name: 'Updated' };
      mockUpdateCategoryUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Category not found'))
      );

      // Act & Assert
      await expect(
        controller.updateCategory('non-existent', dto as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('deleteCategory', () => {
    it('Given: valid category id When: deleting Then: should return success', async () => {
      // Arrange
      mockDeleteCategoryUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Category deleted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.deleteCategory('cat-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });

    it('Given: non-existent category When: deleting Then: should throw NotFoundError', async () => {
      // Arrange
      mockDeleteCategoryUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Category not found'))
      );

      // Act & Assert
      await expect(controller.deleteCategory('non-existent', 'org-123')).rejects.toThrow();
    });

    it('Given: category with subcategories When: deleting Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockDeleteCategoryUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Category has subcategories or products'))
      );

      // Act & Assert
      await expect(controller.deleteCategory('cat-123', 'org-123')).rejects.toThrow();
    });
  });
});
