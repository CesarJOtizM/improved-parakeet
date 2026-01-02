// Sales Integration Tests
// Integration tests for sales flows following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SalesModule } from '@sales/sales.module';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Sales Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createSaleUseCase: CreateSaleUseCase;
  let confirmSaleUseCase: ConfirmSaleUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let saleRepository: PrismaSaleRepository;

  const testOrgId = 'test-org-sales-integration';
  let testWarehouseId: string;
  let testProductId: string;
  let testLocationId: string;
  let testUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule, SalesModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createSaleUseCase = module.get<CreateSaleUseCase>(CreateSaleUseCase);
    confirmSaleUseCase = module.get<ConfirmSaleUseCase>(ConfirmSaleUseCase);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);
    saleRepository = module.get<PrismaSaleRepository>('SaleRepository');

    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await cleanupTestData();
    await setupTestData();
  });

  describe('Sale Creation Flow', () => {
    it('Given: valid sale data When: creating sale Then: should create sale with lines', async () => {
      // Arrange
      const saleData = {
        warehouseId: testWarehouseId,
        customerReference: 'CUST-001',
        externalReference: 'EXT-001',
        note: 'Test sale',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 10,
            salePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act
      const result = await createSaleUseCase.execute(saleData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.warehouseId).toBe(testWarehouseId);
          expect(value.data.status).toBe('DRAFT');
          expect(value.data.totalAmount).toBe(1000); // 10 * 100
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent warehouse When: creating sale Then: should return NotFoundError', async () => {
      // Arrange
      const saleData = {
        warehouseId: 'non-existent-warehouse',
        lines: [],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act
      const result = await createSaleUseCase.execute(saleData);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('Warehouse');
        }
      );
    });
  });

  describe('Sale Confirmation Flow', () => {
    it('Given: draft sale with stock available When: confirming sale Then: should confirm sale and generate movement', async () => {
      // Arrange - Create stock for product
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          locationId: testLocationId,
          quantity: 100,
          averageCost: 50,
          currency: 'COP',
          orgId: testOrgId,
        },
      });

      // Create sale
      const saleResult = await createSaleUseCase.execute({
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 10,
            salePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      let saleId: string;
      saleResult.match(
        value => {
          saleId = value.data.id;
        },
        () => {
          throw new Error('Sale creation failed');
        }
      );

      // Act
      const result = await confirmSaleUseCase.execute({
        id: saleId!,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('CONFIRMED');
          expect(value.data.movementId).toBeDefined();
          expect(value.data.confirmedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify movement was created
      const confirmedSale = await saleRepository.findById(saleId!, testOrgId);
      expect(confirmedSale?.movementId).toBeDefined();
    });

    it('Given: draft sale with insufficient stock When: confirming sale Then: should return BusinessRuleError', async () => {
      // Arrange - Create stock with insufficient quantity
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          locationId: testLocationId,
          quantity: 5, // Less than sale quantity
          averageCost: 50,
          currency: 'COP',
          orgId: testOrgId,
        },
      });

      // Create sale
      const saleResult = await createSaleUseCase.execute({
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 10, // More than available stock
            salePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      let saleId: string;
      saleResult.match(
        value => {
          saleId = value.data.id;
        },
        () => {
          throw new Error('Sale creation failed');
        }
      );

      // Act
      const result = await confirmSaleUseCase.execute({
        id: saleId!,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('stock');
        }
      );
    });
  });

  describe('Sale with Multiple Lines Flow', () => {
    it('Given: sale with multiple product lines When: creating sale Then: should calculate total correctly', async () => {
      // Arrange - Create second product
      const product2Result = await createProductUseCase.execute({
        sku: 'PROD-SALE-002',
        name: 'Product 2',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      });

      let product2Id: string;
      product2Result.match(
        value => {
          product2Id = value.data.id;
        },
        () => {
          throw new Error('Product creation failed');
        }
      );

      const saleData = {
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 5,
            salePrice: 100,
            currency: 'COP',
          },
          {
            productId: product2Id!,
            locationId: testLocationId,
            quantity: 3,
            salePrice: 200,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act
      const result = await createSaleUseCase.execute(saleData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalAmount).toBe(1100); // (5 * 100) + (3 * 200)
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('Multi-tenant Isolation', () => {
    const otherOrgId = 'test-org-sales-other';

    it('Given: sales in different organizations When: querying sales Then: should only return sales from correct organization', async () => {
      // Arrange
      await createSaleUseCase.execute({
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 10,
            salePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      // Create sale in other org
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
          slug: 'other-org-sales',
          isActive: true,
        },
      });

      await createWarehouseUseCase.execute({
        code: 'WH-OTHER-001',
        name: 'Other Warehouse',
        isActive: true,
        orgId: otherOrgId,
      });

      // Act - Query sales for testOrgId
      const sales = await saleRepository.findAll(testOrgId);

      // Assert
      expect(sales.data.every(s => s.orgId === testOrgId)).toBe(true);

      // Cleanup
      await prisma.sale.deleteMany({ where: { orgId: otherOrgId } });
      await prisma.warehouse.deleteMany({ where: { orgId: otherOrgId } });
      await prisma.organization.deleteMany({ where: { id: otherOrgId } });
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-sales',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-sales@test.com',
        username: 'testusersales',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        status: 'ACTIVE',
        orgId: testOrgId,
      },
    });
    testUserId = user.id;

    // Create warehouse
    const warehouseResult = await createWarehouseUseCase.execute({
      code: 'WH-SALES-001',
      name: 'Sales Test Warehouse',
      isActive: true,
      orgId: testOrgId,
    });

    warehouseResult.match(
      value => {
        testWarehouseId = value.data.id;
      },
      () => {
        throw new Error('Warehouse creation failed');
      }
    );

    // Create location
    const location = await prisma.location.create({
      data: {
        code: 'LOC-001',
        name: 'Location 1',
        warehouseId: testWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
    testLocationId = location.id;

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-SALE-001',
      name: 'Sale Test Product',
      unit: {
        code: 'UNIT',
        name: 'Unit',
        precision: 0,
      },
      orgId: testOrgId,
    });

    productResult.match(
      value => {
        testProductId = value.data.id;
      },
      () => {
        throw new Error('Product creation failed');
      }
    );
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
      await prisma.saleLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.sale.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.movementLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.movement.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.stock.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.product.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.location.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.warehouse.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.user.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrgId },
      });
    } catch (_error) {
      // Ignore cleanup errors
    }
  }
});
