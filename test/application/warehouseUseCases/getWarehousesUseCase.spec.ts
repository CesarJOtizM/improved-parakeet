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
    const createMockWarehouse = () => {
      return Warehouse.create(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Test Warehouse',
          isActive: true,
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
  });
});
