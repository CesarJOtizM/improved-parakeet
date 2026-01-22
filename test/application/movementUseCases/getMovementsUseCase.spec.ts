import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { MovementMapper } from '@movement/mappers';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('GetMovementsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetMovementsUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMovementRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      findByProduct: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    useCase = new GetMovementsUseCase(mockMovementRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockMovement = (type: 'IN' | 'OUT' = 'IN') => {
      const props = MovementMapper.toDomainProps({
        type,
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: 'user-123',
      });
      return Movement.create(props, mockOrgId);
    };

    const createMovementWithLines = ({
      type = 'IN',
      status = 'DRAFT',
      postedAt,
      productIds = ['product-1'],
      warehouseId = 'warehouse-123',
    }: {
      type?: 'IN' | 'OUT';
      status?: 'DRAFT' | 'POSTED' | 'VOID';
      postedAt?: Date;
      productIds?: string[];
      warehouseId?: string;
    }) => {
      const lines = productIds.map(productId =>
        MovementMapper.createLineEntity(
          {
            productId,
            locationId: 'location-1',
            quantity: 2,
            unitCost: 10,
            currency: 'USD',
          },
          0,
          mockOrgId
        )
      );
      const props = {
        type: MovementType.create(type),
        status: MovementStatus.create(status),
        warehouseId,
        createdBy: 'user-123',
        postedAt,
      };
      return Movement.reconstitute(props, `movement-${productIds.join('-')}`, mockOrgId, lines);
    };

    const createMockProduct = (sku: string, name: string) => {
      const props = ProductMapper.toDomainProps({
        sku,
        name,
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    it('Given: valid request When: getting movements Then: should return paginated movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN'), createMockMovement('OUT')];

      mockMovementRepository.findAll.mockResolvedValue(mockMovements);

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
          expect(value.message).toBe('Movements retrieved successfully');
          expect(value.data.length).toBeGreaterThanOrEqual(0);
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with warehouse filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'warehouse-123',
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
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with status filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT',
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

    it('Given: request with type filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'IN',
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

    it('Given: request with product and date filters When: getting movements Then: should include product info and handle errors', async () => {
      // Arrange
      const movementWithPostedAt = createMovementWithLines({
        type: 'IN',
        status: 'POSTED',
        postedAt: new Date('2024-01-10T10:00:00.000Z'),
        productIds: ['product-1', 'product-2'],
      });
      const movementWithoutPostedAt = createMovementWithLines({
        type: 'OUT',
        status: 'DRAFT',
        productIds: ['product-3'],
      });

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: [movementWithoutPostedAt, movementWithPostedAt],
        total: 2,
        hasMore: false,
      });

      mockProductRepository.findById.mockImplementation(async (productId: string) => {
        if (productId === 'product-2') {
          throw new Error('Product lookup failed');
        }
        return createMockProduct(`SKU-${productId}`, `Product ${productId}`);
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        productId: 'product-1',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-02-01T00:00:00.000Z'),
        sortBy: 'postedAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-1', mockOrgId);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-2', mockOrgId);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-3', mockOrgId);
    });

    it('Given: request with sortBy type When: getting movements Then: should return sorted data', async () => {
      // Arrange
      const mockMovements = [createMockMovement('OUT'), createMockMovement('IN')];
      mockMovementRepository.findAll.mockResolvedValue(mockMovements);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'type',
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

    it('Given: empty movements list When: getting movements Then: should return empty paginated result', async () => {
      // Arrange
      mockMovementRepository.findAll.mockResolvedValue([]);

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
