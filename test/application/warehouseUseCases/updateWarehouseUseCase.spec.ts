import { UpdateWarehouseUseCase } from '@application/warehouseUseCases/updateWarehouseUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import type { IStockRepository } from '@stock/domain/ports/repositories';

describe('UpdateWarehouseUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockWarehouseId = 'warehouse-123';

  let useCase: UpdateWarehouseUseCase;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;

  const createMockWarehouse = (overrides: Partial<{ isActive: boolean }> = {}) => {
    const props = {
      code: WarehouseCode.create('WH-001'),
      name: 'Test Warehouse',
      address: Address.create('123 Main St'),
      isActive: overrides.isActive ?? true,
    };
    return Warehouse.reconstitute(props, mockWarehouseId, mockOrgId);
  };

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

    mockStockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findBySpecification: jest.fn(),
      findByProductAndWarehouse: jest.fn(),
      findByWarehouse: jest.fn(),
      findByProduct: jest.fn(),
      findLowStock: jest.fn(),
    } as unknown as jest.Mocked<IStockRepository>;

    useCase = new UpdateWarehouseUseCase(mockWarehouseRepository, mockStockRepository);
  });

  describe('execute', () => {
    it('Given: valid update data When: updating warehouse Then: should return success result', async () => {
      // Arrange
      const warehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);
      mockWarehouseRepository.save.mockResolvedValue(warehouse);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        name: 'Updated Warehouse',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Warehouse updated successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockWarehouseRepository.findById).toHaveBeenCalledWith(mockWarehouseId, mockOrgId);
      expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent warehouse When: updating Then: should return NotFoundError', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockResolvedValue(null);

      const request = {
        warehouseId: 'non-existent-id',
        orgId: mockOrgId,
        name: 'Updated',
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
          expect(error.message).toContain('Warehouse not found');
        }
      );
    });

    it('Given: active warehouse with stock When: deactivating Then: should return ValidationError', async () => {
      // Arrange
      const warehouse = createMockWarehouse({ isActive: true });
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);

      const mockStockItem = {
        quantity: { isPositive: () => true },
      } as unknown;
      mockStockRepository.findAll.mockResolvedValue([mockStockItem] as never);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        isActive: false,
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
          expect(error.message).toContain('Cannot deactivate warehouse with existing stock');
        }
      );
    });

    it('Given: active warehouse with zero stock When: deactivating Then: should succeed', async () => {
      // Arrange
      const warehouse = createMockWarehouse({ isActive: true });
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);

      const mockStockItem = {
        quantity: { isPositive: () => false },
      } as unknown;
      mockStockRepository.findAll.mockResolvedValue([mockStockItem] as never);
      mockWarehouseRepository.save.mockResolvedValue(warehouse);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        isActive: false,
        updatedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: update with address When: updating Then: should create Address value object', async () => {
      // Arrange
      const warehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);
      mockWarehouseRepository.save.mockResolvedValue(warehouse);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        address: {
          street: '456 Oak Ave',
          city: 'New City',
          state: 'NC',
          zipCode: '67890',
          country: 'US',
        },
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: no changes When: updating Then: should still save and return success', async () => {
      // Arrange
      const warehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);
      mockWarehouseRepository.save.mockResolvedValue(warehouse);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: isActive update When: updating Then: should set statusChangedBy', async () => {
      // Arrange
      const warehouse = createMockWarehouse({ isActive: false });
      mockWarehouseRepository.findById.mockResolvedValue(warehouse);
      mockWarehouseRepository.save.mockResolvedValue(warehouse);

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        isActive: true,
        updatedBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: repository throws When: updating Then: should return ValidationError', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockRejectedValue(new Error('DB connection failed'));

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        name: 'Updated',
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
          expect(error.message).toContain('Failed to update warehouse');
          expect(error.message).toContain('DB connection failed');
        }
      );
    });

    it('Given: non-Error thrown When: updating Then: should handle unknown error', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockRejectedValue('string error');

      const request = {
        warehouseId: mockWarehouseId,
        orgId: mockOrgId,
        name: 'Updated',
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
  });
});
