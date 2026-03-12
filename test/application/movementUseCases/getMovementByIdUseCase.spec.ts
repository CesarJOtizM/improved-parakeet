/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetMovementByIdUseCase } from '@application/movementUseCases/getMovementByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';

import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';

describe('GetMovementByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';
  const mockWarehouseId = 'warehouse-123';
  const mockProductId = 'product-123';
  const mockUserId = 'user-123';

  let useCase: GetMovementByIdUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockPrismaService: {
    warehouse: { findFirst: jest.Mock<any> };
    user: { findMany: jest.Mock<any> };
  };

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

    mockPrismaService = {
      warehouse: {
        findFirst: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    useCase = new GetMovementByIdUseCase(
      mockMovementRepository,
      mockProductRepository,
      mockPrismaService as any
    );
  });

  describe('execute', () => {
    const createMockMovement = (withLines = false) => {
      const props = MovementMapper.toDomainProps({
        type: 'IN',
        warehouseId: mockWarehouseId,
        reference: 'REF-001',
        reason: 'PURCHASE',
        note: 'Test movement',
        lines: [],
        createdBy: mockUserId,
      });

      const lines = withLines
        ? [
            MovementMapper.createLineEntity(
              {
                productId: mockProductId,
                quantity: 10,
                unitCost: 100,
                currency: 'COP',
              },
              0,
              mockOrgId
            ),
          ]
        : [];

      return Movement.reconstitute(props, mockMovementId, mockOrgId, lines);
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    const validRequest = {
      movementId: mockMovementId,
      orgId: mockOrgId,
    };

    it('Given: movement exists without lines When: getting by ID Then: should return success result', async () => {
      // Arrange
      const mockMovement = createMockMovement(false);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        name: 'Main Warehouse',
        code: 'WH-001',
      } as any);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: mockUserId, firstName: 'John', lastName: 'Doe' },
      ] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement retrieved successfully');
          expect(value.data.id).toBe(mockMovementId);
          expect(value.data.type).toBe('IN');
          expect(value.data.status).toBe('DRAFT');
          expect(value.data.warehouseId).toBe(mockWarehouseId);
          expect(value.data.lines).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent movement When: getting by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockMovementRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Movement not found');
        }
      );
    });

    it('Given: movement with lines When: getting by ID Then: should return movement with product info', async () => {
      // Arrange
      const mockMovement = createMockMovement(true);
      const mockProduct = createMockProduct();

      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        name: 'Main Warehouse',
        code: 'WH-001',
      } as any);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: mockUserId, firstName: 'John', lastName: 'Doe' },
      ] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.lines).toHaveLength(1);
          expect(value.data.lines[0].productId).toBe(mockProductId);
          expect(value.data.lines[0].sku).toBe('PROD-001');
          expect(value.data.lines[0].name).toBe('Test Product');
          expect(value.data.lines[0].quantity).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId, mockOrgId);
    });

    it('Given: movement with lines but product not found When: getting by ID Then: should return movement without product info', async () => {
      // Arrange
      const mockMovement = createMockMovement(true);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockProductRepository.findById.mockResolvedValue(null);
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        name: 'Main Warehouse',
        code: 'WH-001',
      } as any);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: mockUserId, firstName: 'John', lastName: 'Doe' },
      ] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.lines).toHaveLength(1);
          expect(value.data.lines[0].sku).toBeUndefined();
          expect(value.data.lines[0].name).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: movement exists When: getting by ID Then: should resolve warehouse name', async () => {
      // Arrange
      const mockMovement = createMockMovement(false);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        name: 'Central Warehouse',
        code: 'WH-CENTRAL',
      } as any);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: mockUserId, firstName: 'John', lastName: 'Doe' },
      ] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.warehouseName).toBe('Central Warehouse');
          expect(value.data.warehouseCode).toBe('WH-CENTRAL');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockPrismaService.warehouse.findFirst).toHaveBeenCalledWith({
        where: { id: mockWarehouseId },
        select: { name: true, code: true },
      });
    });

    it('Given: movement exists When: getting by ID Then: should resolve user names', async () => {
      // Arrange
      const mockMovement = createMockMovement(false);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null as any);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: mockUserId, firstName: 'Jane', lastName: 'Smith' },
      ] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.createdByName).toBe('Jane Smith');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product fetch throws error When: getting by ID Then: should still return movement without product info', async () => {
      // Arrange
      const mockMovement = createMockMovement(true);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockProductRepository.findById.mockRejectedValue(new Error('Database connection error'));
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null as any);
      mockPrismaService.user.findMany.mockResolvedValue([] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.lines).toHaveLength(1);
          expect(value.data.lines[0].sku).toBeUndefined();
          expect(value.data.lines[0].name).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: movement with no warehouse found When: getting by ID Then: should return undefined for warehouse fields', async () => {
      // Arrange
      const mockMovement = createMockMovement(false);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null as any);
      mockPrismaService.user.findMany.mockResolvedValue([] as any);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.warehouseName).toBeUndefined();
          expect(value.data.warehouseCode).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
