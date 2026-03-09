import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
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

    it('Given: sortBy name When: getting warehouses Then: should sort by name ascending', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-002', 'Zeta Warehouse'),
        createMockWarehouse('WH-001', 'Alpha Warehouse'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          expect(value.data[0].name).toBe('Alpha Warehouse');
          expect(value.data[1].name).toBe('Zeta Warehouse');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy isActive When: getting warehouses Then: should sort by active status', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Inactive Warehouse', false),
        createMockWarehouse('WH-002', 'Active Warehouse', true),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'isActive',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // isActive false=0 < true=1, so inactive first in asc
          expect(value.data[0].isActive).toBe(false);
          expect(value.data[1].isActive).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy createdAt When: getting warehouses Then: should sort by creation date', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Warehouse A'),
        createMockWarehouse('WH-002', 'Warehouse B'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
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

    it('Given: sortBy updatedAt When: getting warehouses Then: should sort by update date', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Warehouse A'),
        createMockWarehouse('WH-002', 'Warehouse B'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'updatedAt',
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

    it('Given: sortBy unknown field When: getting warehouses Then: should fallback to createdAt sort', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Warehouse A'),
        createMockWarehouse('WH-002', 'Warehouse B'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'unknownField',
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

    it('Given: sortOrder desc When: getting warehouses Then: should reverse sort order', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Alpha Warehouse'),
        createMockWarehouse('WH-002', 'Zeta Warehouse'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // desc: Zeta > Alpha
          expect(value.data[0].name).toBe('Zeta Warehouse');
          expect(value.data[1].name).toBe('Alpha Warehouse');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: page 2 with multi-page data When: getting warehouses Then: should return hasPrev true', async () => {
      // Arrange - create enough warehouses to span multiple pages
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Warehouse 1'),
        createMockWarehouse('WH-002', 'Warehouse 2'),
        createMockWarehouse('WH-003', 'Warehouse 3'),
        createMockWarehouse('WH-004', 'Warehouse 4'),
        createMockWarehouse('WH-005', 'Warehouse 5'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 2,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.hasPrev).toBe(true);
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.total).toBe(5);
          expect(value.pagination.totalPages).toBe(3);
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: search matching code When: getting warehouses Then: should filter by warehouse code', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-001', 'Warehouse Alpha'),
        createMockWarehouse('WH-999', 'Warehouse Beta'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        search: 'WH-999',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].code).toBe('WH-999');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy without explicit sortOrder When: getting warehouses Then: should default to ascending', async () => {
      // Arrange
      const mockWarehouses = [
        createMockWarehouse('WH-002', 'Zeta Warehouse'),
        createMockWarehouse('WH-001', 'Alpha Warehouse'),
      ];
      mockWarehouseRepository.findAll.mockResolvedValue(mockWarehouses);

      const request = {
        orgId: mockOrgId,
        sortBy: 'name',
        // no sortOrder specified - should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].name).toBe('Alpha Warehouse');
          expect(value.data[1].name).toBe('Zeta Warehouse');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: default pagination When: getting warehouses Then: should use page 1 and limit 10', async () => {
      // Arrange
      mockWarehouseRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        // no page or limit specified
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouse with address When: getting warehouses Then: should return address object', async () => {
      // Arrange
      const warehouseWithAddress = Warehouse.create(
        {
          code: WarehouseCode.create('WH-ADDR'),
          name: 'Addressed Warehouse',
          address: Address.create('123 Main St, City'),
          isActive: true,
        },
        mockOrgId
      );
      mockWarehouseRepository.findAll.mockResolvedValue([warehouseWithAddress]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].address).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
