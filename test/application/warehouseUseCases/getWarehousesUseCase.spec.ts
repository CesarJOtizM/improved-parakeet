import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('GetWarehousesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetWarehousesUseCase;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWarehouseRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByCode: jest.fn(),
      existsByCode: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<IWarehouseRepository>;

    useCase = new GetWarehousesUseCase(mockWarehouseRepository);
  });

  describe('execute', () => {
    const createMockWarehouse = (code = 'WH-001', name = 'Test Warehouse', isActive = true) => {
      return Warehouse.create(
        {
          code: WarehouseCode.create(code),
          name,
          isActive,
        },
        mockOrgId
      );
    };

    it('Given: valid request When: getting warehouses Then: should return paginated warehouses', async () => {
      // Arrange
      const mockWarehouses = [createMockWarehouse(), createMockWarehouse()];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Warehouses retrieved successfully');
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with isActive filter When: getting warehouses Then: should return filtered warehouses', async () => {
      // Arrange
      const mockWarehouses = [createMockWarehouse()];
      mockWarehouseRepository.findActive.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        isActive: true,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockWarehouseRepository.findActive).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: request with isActive=false When: getting warehouses Then: should filter inactive warehouses', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Active Warehouse', true),
        createMockWarehouse('WH-002', 'Inactive Warehouse', false),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        isActive: false,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].isActive).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with search filter When: getting warehouses Then: should return filtered warehouses', async () => {
      // Arrange
      const mockWarehouses = [createMockWarehouse()];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'Test',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with sortBy code When: getting warehouses Then: should return sorted warehouses', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-002', 'Warehouse B'),
        createMockWarehouse('WH-001', 'Warehouse A'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'code',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty warehouses list When: getting warehouses Then: should return empty paginated result', async () => {
      // Arrange
      mockWarehouseRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
