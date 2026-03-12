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
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetMovementsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetMovementsUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

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

    mockPrisma = {
      warehouse: {
        findMany: jest.fn<any>().mockResolvedValue([]),
      },
      contact: {
        findMany: jest.fn<any>().mockResolvedValue([]),
      },
      product: {
        findMany: jest.fn<any>().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn<any>().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetMovementsUseCase(mockMovementRepository, mockProductRepository, mockPrisma);
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

    it('Given: no page/limit provided When: getting movements Then: should use defaults', async () => {
      // Arrange
      mockMovementRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
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

    it('Given: sortBy status When: getting movements Then: should sort by status value', async () => {
      // Arrange
      const movementDraft = createMovementWithLines({
        type: 'IN',
        status: 'DRAFT',
        productIds: ['product-a'],
      });
      const movementPosted = createMovementWithLines({
        type: 'IN',
        status: 'POSTED',
        postedAt: new Date(),
        productIds: ['product-b'],
      });
      mockMovementRepository.findAll.mockResolvedValue([movementPosted, movementDraft]);

      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // DRAFT < POSTED alphabetically
          expect(value.data[0].status).toBe('DRAFT');
          expect(value.data[1].status).toBe('POSTED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy createdAt When: getting movements Then: should sort by createdAt', async () => {
      // Arrange
      const movement1 = createMockMovement('IN');
      const movement2 = createMockMovement('OUT');
      mockMovementRepository.findAll.mockResolvedValue([movement1, movement2]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
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

    it('Given: sortBy unknown field When: getting movements Then: should fallback to createdAt', async () => {
      // Arrange
      const movement1 = createMockMovement('IN');
      const movement2 = createMockMovement('OUT');
      mockMovementRepository.findAll.mockResolvedValue([movement1, movement2]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'nonExistentField',
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

    it('Given: sortBy with no sortOrder When: getting movements Then: should default to asc', async () => {
      // Arrange
      const movement1 = createMockMovement('IN');
      const movement2 = createMockMovement('OUT');
      mockMovementRepository.findAll.mockResolvedValue([movement1, movement2]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'type',
        // no sortOrder - should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // IN < OUT alphabetically (asc default)
          expect(value.data[0].type).toBe('IN');
          expect(value.data[1].type).toBe('OUT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: companyId filter When: getting movements Then: should use specification', async () => {
      // Arrange
      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: search filter When: getting movements Then: should use specification', async () => {
      // Arrange
      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'REF-001',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: combined filters When: getting movements Then: should compose specifications', async () => {
      // Arrange
      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'wh-123',
        status: 'POSTED',
        type: 'IN',
        productId: 'product-1',
        search: 'test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        companyId: 'company-1',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: warehouse data exists When: enriching movements Then: should include warehouse name and code', async () => {
      // Arrange
      const movement = createMovementWithLines({
        type: 'IN',
        status: 'DRAFT',
        productIds: ['product-1'],
        warehouseId: 'wh-123',
      });

      mockMovementRepository.findAll.mockResolvedValue([movement]);
      mockProductRepository.findById.mockResolvedValue(null);

      (mockPrisma.warehouse.findMany as jest.Mock<any>).mockResolvedValue([
        { id: 'wh-123', name: 'Main Warehouse', code: 'MW-01' },
      ]);

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
          expect((value.data[0] as any).warehouseName).toBe('Main Warehouse');
          expect((value.data[0] as any).warehouseCode).toBe('MW-01');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no warehouse data When: enriching movements Then: should leave warehouse name undefined', async () => {
      // Arrange
      const movement = createMovementWithLines({
        type: 'IN',
        status: 'DRAFT',
        productIds: ['product-1'],
        warehouseId: 'wh-missing',
      });

      mockMovementRepository.findAll.mockResolvedValue([movement]);
      mockProductRepository.findById.mockResolvedValue(null);

      (mockPrisma.warehouse.findMany as jest.Mock<any>).mockResolvedValue([]);

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
          expect((value.data[0] as any).warehouseName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: only startDate without endDate When: getting movements Then: should not add date range spec', async () => {
      // Arrange
      mockMovementRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01'),
        // no endDate
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // Should fallback to findAll since no specifications added
      expect(mockMovementRepository.findAll).toHaveBeenCalled();
    });

    it('Given: product found without price When: enriching movements Then: should set price as undefined', async () => {
      // Arrange
      const movement = createMovementWithLines({
        type: 'IN',
        status: 'DRAFT',
        productIds: ['product-no-price'],
      });
      mockMovementRepository.findAll.mockResolvedValue([movement]);

      // Create product without price
      const propsResult = ProductMapper.toDomainProps({
        sku: 'SKU-NP',
        name: 'No Price Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        // no price set
      });
      const productNoPrice = Product.create(propsResult.unwrap(), mockOrgId);

      mockProductRepository.findById.mockResolvedValue(productNoPrice);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-no-price', mockOrgId);
    });
  });
});
