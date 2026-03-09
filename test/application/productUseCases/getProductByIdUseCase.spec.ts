import { GetProductByIdUseCase } from '@application/productUseCases/getProductByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';
import { Money, Quantity } from '@inventory/stock';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IStockData } from '@stock/domain/ports/repositories/iStockRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IStockRepository } from '@stock/domain/ports/repositories/iStockRepository.port';
import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';
import type { IMovementRepository } from '@movement/domain/ports/repositories/iMovementRepository.port';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetProductByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockProductId = 'product-123';

  let useCase: GetProductByIdUseCase;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockReorderRuleRepository: jest.Mocked<IReorderRuleRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<IStockRepository>;

    mockReorderRuleRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByProductAndWarehouse: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IReorderRuleRepository>;

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
      findByProduct: jest.fn().mockResolvedValue([]),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetProductByIdUseCase(
      mockProductRepository,
      mockStockRepository,
      mockReorderRuleRepository,
      mockMovementRepository,
      mockPrisma
    );
  });

  describe('execute', () => {
    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        description: 'Test Description',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        barcode: '1234567890',
        brand: 'Test Brand',
        model: 'Test Model',
        status: 'ACTIVE',
        costMethod: 'AVG',
      }).unwrap();
      return Product.reconstitute(props, mockProductId, mockOrgId);
    };

    it('Given: existing product ID When: getting product by ID Then: should return product', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Product retrieved successfully');
          expect(value.data.id).toBe(mockProductId);
          expect(value.data.sku).toBe('PROD-001');
          expect(value.data.name).toBe('Test Product');
          expect(value.data.orgId).toBe(mockOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId, mockOrgId);
    });

    it('Given: non-existent product ID When: getting product by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        productId: 'non-existent-id',
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
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Product not found');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith('non-existent-id', mockOrgId);
    });

    it('Given: product from different organization When: getting product by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        productId: mockProductId,
        orgId: 'different-org-id',
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
        }
      );
    });

    it('Given: product with stock data When: getting product by ID Then: should compute averageCost and totalStock', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const stockRecords: IStockData[] = [
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          quantity: Quantity.create(100),
          averageCost: Money.create(50, 'COP'),
          orgId: mockOrgId,
        },
        {
          productId: mockProductId,
          warehouseId: 'wh-2',
          quantity: Quantity.create(200),
          averageCost: Money.create(75, 'COP'),
          orgId: mockOrgId,
        },
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // totalStock = 100 + 200 = 300
          expect(value.data.totalStock).toBe(300);
          // weightedCostSum = 100*50 + 200*75 = 5000 + 15000 = 20000
          // averageCost = 20000 / 300 = 66.666... => rounded to 66.67
          expect(value.data.averageCost).toBe(66.67);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with zero stock When: getting product by ID Then: averageCost should be 0', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalStock).toBe(0);
          expect(value.data.averageCost).toBe(0);
          expect(value.data.margin).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product without price When: getting product by ID Then: price should be 0 and profit negative', async () => {
      // Arrange - create product without price
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-NO-PRICE',
        name: 'No Price Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        // no price
      });
      const productNoPrice = Product.reconstitute(propsResult.unwrap(), mockProductId, mockOrgId);
      mockProductRepository.findById.mockResolvedValue(productNoPrice);

      const stockRecords: IStockData[] = [
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          quantity: Quantity.create(100),
          averageCost: Money.create(50, 'COP'),
          orgId: mockOrgId,
        },
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.price).toBe(0);
          expect(value.data.currency).toBe('COP');
          // profit = 0 - 50 = -50
          expect(value.data.profit).toBe(-50);
          // margin = ((0 - 50) / 50) * 100 = -100
          expect(value.data.margin).toBe(-100);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with reorder rules When: getting product by ID Then: should aggregate reorder rules', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      const rule1 = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        'rule-1',
        mockOrgId
      );
      const rule2 = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: 'wh-2',
          minQty: MinQuantity.create(20),
          maxQty: MaxQuantity.create(200),
          safetyQty: SafetyStock.create(10),
        },
        'rule-2',
        mockOrgId
      );
      // Add a rule for a different product (should be filtered out)
      const otherRule = ReorderRule.reconstitute(
        {
          productId: 'other-product',
          warehouseId: 'wh-1',
          minQty: MinQuantity.create(50),
          maxQty: MaxQuantity.create(500),
          safetyQty: SafetyStock.create(25),
        },
        'rule-3',
        mockOrgId
      );
      mockReorderRuleRepository.findAll.mockResolvedValue([rule1, rule2, otherRule]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // minStock = 10 + 20 = 30
          expect(value.data.minStock).toBe(30);
          // maxStock = 100 + 200 = 300
          expect(value.data.maxStock).toBe(300);
          // safetyStock = 5 + 10 = 15
          expect(value.data.safetyStock).toBe(15);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with no reorder rules When: getting product by ID Then: min/max/safety should be 0', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);
      mockReorderRuleRepository.findAll.mockResolvedValue([]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.minStock).toBe(0);
          expect(value.data.maxStock).toBe(0);
          expect(value.data.safetyStock).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with POSTED movements in last 30 days When: getting product by ID Then: should compute rotation metrics', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const stockRecords: IStockData[] = [
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          quantity: Quantity.create(300),
          averageCost: Money.create(50, 'COP'),
          orgId: mockOrgId,
        },
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);

      // Create POSTED IN movement (recent)
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const inLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 50,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const inMovement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          postedAt: recentDate,
        },
        'movement-in',
        mockOrgId,
        inLines
      );

      // Create POSTED OUT movement (recent)
      const outDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const outLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 20,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const outMovement = Movement.reconstitute(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          postedAt: outDate,
        },
        'movement-out',
        mockOrgId,
        outLines
      );

      // Create DRAFT movement (should be ignored)
      const draftLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 99,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const draftMovement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
        },
        'movement-draft',
        mockOrgId,
        draftLines
      );

      mockMovementRepository.findByProduct.mockResolvedValue([
        inMovement,
        outMovement,
        draftMovement,
      ]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalIn30d).toBe(50);
          expect(value.data.totalOut30d).toBe(20);
          // avgDailyConsumption = 20 / 30 = 0.667 => rounded to 0.7
          expect(value.data.avgDailyConsumption).toBe(0.7);
          // daysOfStock = 300 / (20/30) = 450 => rounded to 450
          expect(value.data.daysOfStock).toBe(450);
          // turnoverRate = (0.667 * 365) / 300 = 0.811 => rounded to 0.8
          expect(value.data.turnoverRate).toBe(0.8);
          expect(value.data.lastMovementDate).not.toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with zero daily consumption When: getting product by ID Then: daysOfStock should be null', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const stockRecords: IStockData[] = [
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          quantity: Quantity.create(100),
          averageCost: Money.create(50, 'COP'),
          orgId: mockOrgId,
        },
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);

      // No OUT movements - only IN
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const inLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 50,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const inMovement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          postedAt: recentDate,
        },
        'movement-in-only',
        mockOrgId,
        inLines
      );

      mockMovementRepository.findByProduct.mockResolvedValue([inMovement]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalOut30d).toBe(0);
          expect(value.data.avgDailyConsumption).toBe(0);
          expect(value.data.daysOfStock).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with zero stock and consumption When: getting product by ID Then: turnoverRate should be 0', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);
      mockMovementRepository.findByProduct.mockResolvedValue([]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalStock).toBe(0);
          expect(value.data.turnoverRate).toBe(0);
          expect(value.data.daysOfStock).toBeNull();
          expect(value.data.lastMovementDate).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: movements older than 30 days When: getting product by ID Then: should track lastMovementDate but not count in rotation', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      // Create a POSTED movement older than 30 days
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const outLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 10,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const oldMovement = Movement.reconstitute(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          postedAt: oldDate,
        },
        'movement-old',
        mockOrgId,
        outLines
      );

      mockMovementRepository.findByProduct.mockResolvedValue([oldMovement]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Old movement should not count in 30d metrics
          expect(value.data.totalOut30d).toBe(0);
          expect(value.data.totalIn30d).toBe(0);
          // But lastMovementDate should be set
          expect(value.data.lastMovementDate).not.toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product without optional fields When: getting product by ID Then: should return null/undefined for optional fields', async () => {
      // Arrange - create product without barcode, brand, model, description
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-MINIMAL',
        name: 'Minimal Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        // no description, barcode, brand, model
      });
      const minimalProduct = Product.reconstitute(propsResult.unwrap(), mockProductId, mockOrgId);
      mockProductRepository.findById.mockResolvedValue(minimalProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.barcode).toBeUndefined();
          expect(value.data.brand).toBeUndefined();
          expect(value.data.model).toBeUndefined();
          expect(value.data.description).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with statusChangedBy When: resolving user name Then: should return full name', async () => {
      // Arrange
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-SC',
        name: 'Status Changed Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        status: 'INACTIVE',
      });
      const props = propsResult.unwrap();
      // Add statusChangedBy to props
      const productWithStatusChange = Product.reconstitute(
        { ...props, statusChangedBy: 'user-status-1', statusChangedAt: new Date() },
        mockProductId,
        mockOrgId
      );
      mockProductRepository.findById.mockResolvedValue(productWithStatusChange);
      mockStockRepository.findAll.mockResolvedValue([]);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: 'Admin',
        lastName: 'Manager',
      });

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.statusChangedBy).toBe('Admin Manager');
          expect(value.data.statusChangedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with statusChangedBy but user not found When: resolving user name Then: should return userId', async () => {
      // Arrange
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-SC2',
        name: 'Status Changed Product 2',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        status: 'INACTIVE',
      });
      const props = propsResult.unwrap();
      const productWithStatusChange = Product.reconstitute(
        { ...props, statusChangedBy: 'user-unknown', statusChangedAt: new Date() },
        mockProductId,
        mockOrgId
      );
      mockProductRepository.findById.mockResolvedValue(productWithStatusChange);
      mockStockRepository.findAll.mockResolvedValue([]);

      // User not found
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Should fall back to userId when user not found
          expect(value.data.statusChangedBy).toBe('user-unknown');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with statusChangedBy but prisma throws When: resolving user name Then: should return userId', async () => {
      // Arrange
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-SC3',
        name: 'Status Changed Product 3',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        status: 'INACTIVE',
      });
      const props = propsResult.unwrap();
      const productWithStatusChange = Product.reconstitute(
        { ...props, statusChangedBy: 'user-error', statusChangedAt: new Date() },
        mockProductId,
        mockOrgId
      );
      mockProductRepository.findById.mockResolvedValue(productWithStatusChange);
      mockStockRepository.findAll.mockResolvedValue([]);

      // Prisma throws error
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Should fall back to userId when prisma throws
          expect(value.data.statusChangedBy).toBe('user-error');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product without statusChangedBy When: resolving user name Then: should return null', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.statusChangedBy).toBeNull();
          expect(value.data.statusChangedAt).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: movements with lines for different products When: computing rotation Then: should only count target product', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      // Movement with lines for multiple products
      const mixedLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 30,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
        MovementMapper.createLineEntity(
          {
            productId: 'other-product',
            locationId: 'loc-1',
            quantity: 100,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const mixedMovement = Movement.reconstitute(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          postedAt: recentDate,
        },
        'movement-mixed',
        mockOrgId,
        mixedLines
      );

      mockMovementRepository.findByProduct.mockResolvedValue([mixedMovement]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Only mockProductId qty should be counted (30), not other-product (100)
          expect(value.data.totalOut30d).toBe(30);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: POSTED movement without postedAt When: computing rotation Then: should use createdAt as fallback', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.findAll.mockResolvedValue([]);

      // Create POSTED movement without postedAt (uses createdAt as fallback)
      const inLines = [
        MovementMapper.createLineEntity(
          {
            productId: mockProductId,
            locationId: 'loc-1',
            quantity: 25,
            unitCost: 50,
            currency: 'COP',
          },
          0,
          mockOrgId
        ),
      ];
      const movementNoPostedAt = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('POSTED'),
          warehouseId: 'wh-1',
          createdBy: 'user-1',
          // no postedAt
        },
        'movement-no-posted-at',
        mockOrgId,
        inLines
      );

      mockMovementRepository.findByProduct.mockResolvedValue([movementNoPostedAt]);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Should still count the movement using createdAt
          expect(value.data.totalIn30d).toBe(25);
          expect(value.data.lastMovementDate).not.toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with price and cost When: computing margin Then: should compute correctly', async () => {
      // Arrange - product with price of 100
      const propsResult = ProductMapper.toDomainProps({
        sku: 'PROD-MARGIN',
        name: 'Margin Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        price: 100,
        currency: 'COP',
      });
      const productWithPrice = Product.reconstitute(propsResult.unwrap(), mockProductId, mockOrgId);
      mockProductRepository.findById.mockResolvedValue(productWithPrice);

      // Stock with averageCost = 40
      const stockRecords: IStockData[] = [
        {
          productId: mockProductId,
          warehouseId: 'wh-1',
          quantity: Quantity.create(50),
          averageCost: Money.create(40, 'COP'),
          orgId: mockOrgId,
        },
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // price = 100, averageCost = 40
          // profit = 100 - 40 = 60
          expect(value.data.profit).toBe(60);
          // margin = ((100 - 40) / 40) * 100 = 150
          expect(value.data.margin).toBe(150);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
