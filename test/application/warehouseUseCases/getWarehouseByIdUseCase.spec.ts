import { GetWarehouseByIdUseCase } from '@application/warehouseUseCases/getWarehouseByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('GetWarehouseByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockWarehouseId = 'warehouse-123';

  let useCase: GetWarehouseByIdUseCase;
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

    useCase = new GetWarehouseByIdUseCase(mockWarehouseRepository);
  });

  const createMockWarehouse = () =>
    Warehouse.create(
      {
        code: WarehouseCode.create('WH-001'),
        name: 'Main Warehouse',
        address: Address.create('Street 123'),
        isActive: true,
      },
      mockOrgId
    );

  it('Given: warehouse exists When: getting by id Then: should return warehouse data', async () => {
    // Arrange
    const warehouse = createMockWarehouse();
    mockWarehouseRepository.findById.mockResolvedValue(warehouse);

    const request = {
      warehouseId: mockWarehouseId,
      orgId: mockOrgId,
    };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.message).toBe('Warehouse retrieved successfully');
        expect(value.data.code).toBe('WH-001');
        expect(value.data.name).toBe('Main Warehouse');
        expect(value.data.address).toBeDefined();
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: warehouse does not exist When: getting by id Then: should return NotFound error', async () => {
    // Arrange
    mockWarehouseRepository.findById.mockResolvedValue(null);

    const request = {
      warehouseId: mockWarehouseId,
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
        expect(error.message).toBe('Warehouse not found');
      }
    );
  });
});
