/* eslint-disable @typescript-eslint/no-explicit-any */
import { WarehousesController } from '@interface/http/inventory/warehouses.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError, ConflictError } from '@shared/domain/result/domainError';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  let mockCreateWarehouseUseCase: any;
  let mockGetWarehousesUseCase: any;
  let mockGetWarehouseByIdUseCase: any;
  let mockUpdateWarehouseUseCase: any;

  const mockWarehouseData = {
    id: 'wh-123',
    code: 'WH-001',
    name: 'Main Warehouse',
    description: 'Primary warehouse',
    address: '123 Main St',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      email: 'test@test.com',
      orgId: 'org-123',
    },
  };

  beforeEach(() => {
    mockCreateWarehouseUseCase = { execute: jest.fn() };
    mockGetWarehousesUseCase = { execute: jest.fn() };
    mockGetWarehouseByIdUseCase = { execute: jest.fn() };
    mockUpdateWarehouseUseCase = { execute: jest.fn() };

    controller = new WarehousesController(
      mockCreateWarehouseUseCase,
      mockGetWarehousesUseCase,
      mockGetWarehouseByIdUseCase,
      mockUpdateWarehouseUseCase
    );
  });

  describe('createWarehouse', () => {
    it('Given: valid warehouse data When: creating warehouse Then: should return created warehouse', async () => {
      // Arrange
      const dto = {
        code: 'WH-001',
        name: 'Main Warehouse',
        description: 'Primary warehouse',
        address: '123 Main St',
        isActive: true,
      };
      mockCreateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockWarehouseData,
          message: 'Warehouse created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createWarehouse(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.code).toBe('WH-001');
      expect(result.data.name).toBe('Main Warehouse');
    });

    it('Given: valid data When: creating warehouse Then: should pass correct params to use case', async () => {
      // Arrange
      const dto = {
        code: 'WH-002',
        name: 'Secondary Warehouse',
        description: 'Backup warehouse',
        address: '456 Oak Ave',
        isActive: true,
      };
      mockCreateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockWarehouseData,
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createWarehouse(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockCreateWarehouseUseCase.execute).toHaveBeenCalledWith({
        code: 'WH-002',
        name: 'Secondary Warehouse',
        description: 'Backup warehouse',
        address: '456 Oak Ave',
        isActive: true,
        orgId: 'org-123',
      });
    });

    it('Given: invalid data When: creating warehouse Then: should throw ValidationError', async () => {
      // Arrange
      const dto = { code: '', name: '' };
      mockCreateWarehouseUseCase.execute.mockResolvedValue(
        err(new ValidationError('Warehouse code and name are required'))
      );

      // Act & Assert
      await expect(
        controller.createWarehouse(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: duplicate code When: creating warehouse Then: should throw ConflictError', async () => {
      // Arrange
      const dto = { code: 'WH-001', name: 'Duplicate' };
      mockCreateWarehouseUseCase.execute.mockResolvedValue(
        err(new ConflictError('Warehouse with code WH-001 already exists'))
      );

      // Act & Assert
      await expect(
        controller.createWarehouse(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getWarehouses', () => {
    it('Given: valid query params When: getting warehouses Then: should return warehouses list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [mockWarehouseData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Warehouses retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetWarehousesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getWarehouses(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('WH-001');
    });

    it('Given: search filter When: getting warehouses Then: should pass search to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, search: 'main' };
      mockGetWarehousesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getWarehouses(query as any, 'org-123');

      // Assert
      expect(mockGetWarehousesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123', search: 'main' })
      );
    });

    it('Given: isActive filter When: getting warehouses Then: should pass isActive to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, isActive: true };
      mockGetWarehousesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockWarehouseData],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getWarehouses(query as any, 'org-123');

      // Assert
      expect(mockGetWarehousesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('Given: sort params When: getting warehouses Then: should pass sortBy and sortOrder', async () => {
      // Arrange
      const query = { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' };
      mockGetWarehousesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getWarehouses(query as any, 'org-123');

      // Assert
      expect(mockGetWarehousesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });

    it('Given: use case error When: getting warehouses Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetWarehousesUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve warehouses'))
      );

      // Act & Assert
      await expect(controller.getWarehouses(query as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('getWarehouseById', () => {
    it('Given: valid warehouse id When: getting warehouse Then: should return warehouse', async () => {
      // Arrange
      mockGetWarehouseByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockWarehouseData,
          message: 'Warehouse retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getWarehouseById('wh-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('wh-123');
      expect(result.data.name).toBe('Main Warehouse');
    });

    it('Given: non-existent warehouse id When: getting warehouse Then: should throw NotFoundError', async () => {
      // Arrange
      mockGetWarehouseByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Warehouse not found'))
      );

      // Act & Assert
      await expect(controller.getWarehouseById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('updateWarehouse', () => {
    it('Given: valid update data When: updating warehouse Then: should return updated warehouse', async () => {
      // Arrange
      const dto = { name: 'Updated Warehouse', address: '789 New St' };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockWarehouseData, name: 'Updated Warehouse', address: '789 New St' },
          message: 'Warehouse updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateWarehouse(
        'wh-123',
        dto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Warehouse');
    });

    it('Given: valid update When: updating warehouse Then: should pass updatedBy from request user', async () => {
      // Arrange
      const dto = { name: 'Updated' };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockWarehouseData,
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateWarehouseUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseId: 'wh-123',
          orgId: 'org-123',
          updatedBy: 'user-123',
        })
      );
    });

    it('Given: non-existent warehouse When: updating Then: should throw NotFoundError', async () => {
      // Arrange
      const dto = { name: 'Updated' };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Warehouse not found'))
      );

      // Act & Assert
      await expect(
        controller.updateWarehouse('non-existent', dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: all update fields When: updating warehouse Then: should pass all fields to use case', async () => {
      // Arrange
      const dto = {
        name: 'Updated Warehouse',
        description: 'New description',
        address: '456 New St',
        isActive: false,
      };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockWarehouseData, ...dto },
          message: 'Warehouse updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateWarehouseUseCase.execute).toHaveBeenCalledWith({
        warehouseId: 'wh-123',
        orgId: 'org-123',
        name: 'Updated Warehouse',
        description: 'New description',
        address: '456 New St',
        isActive: false,
        updatedBy: 'user-123',
      });
    });

    it('Given: use case rejects When: updating warehouse Then: should propagate error', async () => {
      // Arrange
      const dto = { name: 'Updated' };
      mockUpdateWarehouseUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getWarehouseById - additional branches', () => {
    it('Given: valid warehouse When: getting by id Then: should pass correct params', async () => {
      // Arrange
      mockGetWarehouseByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockWarehouseData,
          message: 'Warehouse retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getWarehouseById('wh-123', 'org-123');

      // Assert
      expect(mockGetWarehouseByIdUseCase.execute).toHaveBeenCalledWith({
        warehouseId: 'wh-123',
        orgId: 'org-123',
      });
    });

    it('Given: use case rejects When: getting warehouse Then: should propagate error', async () => {
      // Arrange
      mockGetWarehouseByIdUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getWarehouseById('wh-123', 'org-123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('createWarehouse - no optional fields', () => {
    it('Given: only required fields When: creating warehouse Then: should pass undefined for optional fields', async () => {
      // Arrange
      const dto = {
        code: 'WH-003',
        name: 'Minimal Warehouse',
      };
      mockCreateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockWarehouseData, code: 'WH-003', name: 'Minimal Warehouse' },
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createWarehouse(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockCreateWarehouseUseCase.execute).toHaveBeenCalledWith({
        code: 'WH-003',
        name: 'Minimal Warehouse',
        description: undefined,
        address: undefined,
        isActive: undefined,
        orgId: 'org-123',
      });
    });
  });

  describe('getWarehouses - no filters', () => {
    it('Given: empty query When: getting warehouses Then: should pass all filters as undefined', async () => {
      // Arrange
      const query = {};
      mockGetWarehousesUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getWarehouses(query as any, 'org-123');

      // Assert
      expect(mockGetWarehousesUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: undefined,
        limit: undefined,
        isActive: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });
  });

  describe('updateWarehouse - partial fields', () => {
    it('Given: only name When: updating warehouse Then: should pass undefined for other fields', async () => {
      // Arrange
      const dto = { name: 'New Name Only' };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockWarehouseData, name: 'New Name Only' },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateWarehouseUseCase.execute).toHaveBeenCalledWith({
        warehouseId: 'wh-123',
        orgId: 'org-123',
        name: 'New Name Only',
        description: undefined,
        address: undefined,
        isActive: undefined,
        updatedBy: 'user-123',
      });
    });

    it('Given: only isActive When: updating warehouse Then: should pass undefined for name/description/address', async () => {
      // Arrange
      const dto = { isActive: false };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockWarehouseData, isActive: false },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateWarehouseUseCase.execute).toHaveBeenCalledWith({
        warehouseId: 'wh-123',
        orgId: 'org-123',
        name: undefined,
        description: undefined,
        address: undefined,
        isActive: false,
        updatedBy: 'user-123',
      });
    });

    it('Given: validation error When: updating warehouse Then: should throw', async () => {
      // Arrange
      const dto = { name: '' };
      mockUpdateWarehouseUseCase.execute.mockResolvedValue(
        err(new ValidationError('Warehouse name cannot be empty'))
      );

      // Act & Assert
      await expect(
        controller.updateWarehouse('wh-123', dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });
});
