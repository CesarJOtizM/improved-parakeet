/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReorderRulesController } from '@interface/http/inventory/reorderRules.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError, ConflictError } from '@shared/domain/result/domainError';

describe('ReorderRulesController', () => {
  let controller: ReorderRulesController;
  let mockGetReorderRulesUseCase: any;
  let mockCreateReorderRuleUseCase: any;
  let mockUpdateReorderRuleUseCase: any;
  let mockDeleteReorderRuleUseCase: any;

  const mockReorderRuleData = {
    id: 'rule-123',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    minimumQuantity: 10,
    reorderQuantity: 50,
    maximumQuantity: 200,
    orgId: 'org-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetReorderRulesUseCase = { execute: jest.fn() };
    mockCreateReorderRuleUseCase = { execute: jest.fn() };
    mockUpdateReorderRuleUseCase = { execute: jest.fn() };
    mockDeleteReorderRuleUseCase = { execute: jest.fn() };

    controller = new ReorderRulesController(
      mockGetReorderRulesUseCase,
      mockCreateReorderRuleUseCase,
      mockUpdateReorderRuleUseCase,
      mockDeleteReorderRuleUseCase
    );
  });

  describe('getAll', () => {
    it('Given: valid orgId When: getting reorder rules Then: should return rules list', async () => {
      // Arrange
      mockGetReorderRulesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockReorderRuleData],
          message: 'Reorder rules retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.getAll('org-123')) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].minimumQuantity).toBe(10);
    });

    it('Given: valid orgId When: getting reorder rules Then: should pass orgId to use case', async () => {
      // Arrange
      mockGetReorderRulesUseCase.execute.mockResolvedValue(
        ok({ success: true, data: [], message: 'OK', timestamp: new Date().toISOString() })
      );

      // Act
      await controller.getAll('org-123');

      // Assert
      expect(mockGetReorderRulesUseCase.execute).toHaveBeenCalledWith({ orgId: 'org-123' });
    });

    it('Given: no rules exist When: getting reorder rules Then: should return empty array', async () => {
      // Arrange
      mockGetReorderRulesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          message: 'Reorder rules retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.getAll('org-123')) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('Given: valid reorder rule data When: creating Then: should return created rule', async () => {
      // Arrange
      const dto = {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        minimumQuantity: 10,
        reorderQuantity: 50,
        maximumQuantity: 200,
      };
      mockCreateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReorderRuleData,
          message: 'Reorder rule created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.create('org-123', dto as any)) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.productId).toBe('prod-1');
      expect(result.data.minimumQuantity).toBe(10);
    });

    it('Given: valid data When: creating Then: should spread dto and add orgId', async () => {
      // Arrange
      const dto = {
        productId: 'prod-2',
        warehouseId: 'wh-2',
        minimumQuantity: 5,
        reorderQuantity: 25,
      };
      mockCreateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReorderRuleData,
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.create('org-123', dto as any);

      // Assert
      expect(mockCreateReorderRuleUseCase.execute).toHaveBeenCalledWith({
        productId: 'prod-2',
        warehouseId: 'wh-2',
        minimumQuantity: 5,
        reorderQuantity: 25,
        orgId: 'org-123',
      });
    });

    it('Given: duplicate product-warehouse combo When: creating Then: should throw ConflictError', async () => {
      // Arrange
      const dto = {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        minimumQuantity: 10,
        reorderQuantity: 50,
      };
      mockCreateReorderRuleUseCase.execute.mockResolvedValue(
        err(new ConflictError('Reorder rule already exists for this product-warehouse combination'))
      );

      // Act & Assert
      await expect(controller.create('org-123', dto as any)).rejects.toThrow();
    });

    it('Given: invalid data When: creating Then: should throw ValidationError', async () => {
      // Arrange
      const dto = { productId: '', minimumQuantity: -1 };
      mockCreateReorderRuleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Product ID is required and quantities must be positive'))
      );

      // Act & Assert
      await expect(controller.create('org-123', dto as any)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('Given: valid update data When: updating rule Then: should return updated rule', async () => {
      // Arrange
      const dto = { minimumQuantity: 20, reorderQuantity: 100 };
      mockUpdateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReorderRuleData, minimumQuantity: 20, reorderQuantity: 100 },
          message: 'Reorder rule updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.update('org-123', 'rule-123', dto as any)) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.minimumQuantity).toBe(20);
      expect(result.data.reorderQuantity).toBe(100);
    });

    it('Given: valid update When: updating Then: should pass id, orgId and dto fields to use case', async () => {
      // Arrange
      const dto = { minimumQuantity: 15 };
      mockUpdateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReorderRuleData,
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.update('org-123', 'rule-123', dto as any);

      // Assert
      expect(mockUpdateReorderRuleUseCase.execute).toHaveBeenCalledWith({
        id: 'rule-123',
        orgId: 'org-123',
        minimumQuantity: 15,
      });
    });

    it('Given: non-existent rule When: updating Then: should throw NotFoundError', async () => {
      // Arrange
      const dto = { minimumQuantity: 20 };
      mockUpdateReorderRuleUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Reorder rule not found'))
      );

      // Act & Assert
      await expect(controller.update('org-123', 'non-existent', dto as any)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('Given: valid rule id When: deleting Then: should return success', async () => {
      // Arrange
      mockDeleteReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Reorder rule deleted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.delete('org-123', 'rule-123')) as any;

      // Assert
      expect(result.success).toBe(true);
    });

    it('Given: valid rule id When: deleting Then: should pass id and orgId to use case', async () => {
      // Arrange
      mockDeleteReorderRuleUseCase.execute.mockResolvedValue(
        ok({ success: true, message: 'Deleted', timestamp: new Date().toISOString() })
      );

      // Act
      await controller.delete('org-123', 'rule-123');

      // Assert
      expect(mockDeleteReorderRuleUseCase.execute).toHaveBeenCalledWith({
        id: 'rule-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent rule When: deleting Then: should throw NotFoundError', async () => {
      // Arrange
      mockDeleteReorderRuleUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Reorder rule not found'))
      );

      // Act & Assert
      await expect(controller.delete('org-123', 'non-existent')).rejects.toThrow();
    });
  });

  describe('getAll - error handling', () => {
    it('Given: use case returns error When: getting all rules Then: should throw', async () => {
      // Arrange
      mockGetReorderRulesUseCase.execute.mockResolvedValue(err(new ValidationError('Invalid org')));

      // Act & Assert
      await expect(controller.getAll('org-123')).rejects.toThrow();
    });
  });

  describe('create - additional coverage', () => {
    it('Given: dto with all fields When: creating Then: should spread all dto fields with orgId', async () => {
      // Arrange
      const dto = {
        productId: 'prod-3',
        warehouseId: 'wh-3',
        minimumQuantity: 20,
        reorderQuantity: 100,
        maximumQuantity: 500,
        safetyStock: 30,
      };
      mockCreateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReorderRuleData, ...dto },
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.create('org-456', dto as any)) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateReorderRuleUseCase.execute).toHaveBeenCalledWith({
        ...dto,
        orgId: 'org-456',
      });
    });
  });

  describe('update - additional coverage', () => {
    it('Given: dto with multiple fields When: updating Then: should spread all dto fields with id and orgId', async () => {
      // Arrange
      const dto = {
        minimumQuantity: 25,
        reorderQuantity: 80,
        maximumQuantity: 300,
        safetyStock: 40,
      };
      mockUpdateReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReorderRuleData, ...dto },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.update('org-456', 'rule-456', dto as any)) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateReorderRuleUseCase.execute).toHaveBeenCalledWith({
        id: 'rule-456',
        orgId: 'org-456',
        ...dto,
      });
    });

    it('Given: update returns ValidationError When: updating Then: should throw', async () => {
      // Arrange
      const dto = { minimumQuantity: -5 };
      mockUpdateReorderRuleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Minimum quantity must be positive'))
      );

      // Act & Assert
      await expect(controller.update('org-123', 'rule-123', dto as any)).rejects.toThrow();
    });
  });

  describe('delete - additional coverage', () => {
    it('Given: delete returns success with message When: deleting Then: should return message', async () => {
      // Arrange
      mockDeleteReorderRuleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: null,
          message: 'Reorder rule deleted successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.delete('org-123', 'rule-789')) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Reorder rule deleted successfully');
    });
  });
});
