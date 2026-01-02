// Sale Flow Acceptance Test
// Acceptance test for complete sale flow following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMovementRepository } from '@infrastructure/database/repositories/movement.repository';
import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SalesModule } from '@sales/sales.module';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Sale Flow Acceptance Test
 *
 * This test verifies the complete business flow of a sale:
 * 1. User creates sale with valid data
 * 2. System validates stock availability
 * 3. Sale is confirmed
 * 4. Movement is generated from sale
 * 5. Stock is updated correctly
 */
describeIf(!!process.env.DATABASE_URL)('Sale Flow Acceptance Test', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createSaleUseCase: CreateSaleUseCase;
  let confirmSaleUseCase: ConfirmSaleUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let saleRepository: PrismaSaleRepository;
  let movementRepository: PrismaMovementRepository;

  const testOrgId = 'test-org-sale-acceptance';
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
    movementRepository = module.get<PrismaMovementRepository>('MovementRepository');

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

  describe('Complete Sale Scenario', () => {
    it('Given: authenticated user with stock available When: creating and confirming sale Then: sale created, stock validated, movement generated, stock updated', async () => {
      // Arrange - Stock is available
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

      const saleData = {
        warehouseId: testWarehouseId,
        customerReference: 'CUST-001',
        note: 'Acceptance test sale',
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

      // Act - Step 1: Create sale
      const createResult = await createSaleUseCase.execute(saleData);

      // Assert - Step 1: Sale created successfully
      expect(createResult.isOk()).toBe(true);
      let saleId: string;
      createResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.status).toBe('DRAFT');
          expect(value.data.totalAmount).toBe(1000); // 10 * 100
          saleId = value.data.id;
        },
        () => {
          throw new Error('Sale creation should succeed');
        }
      );

      // Act - Step 2: Confirm sale
      const confirmResult = await confirmSaleUseCase.execute({
        id: saleId!,
        orgId: testOrgId,
      });

      // Assert - Step 2: Sale confirmed successfully
      expect(confirmResult.isOk()).toBe(true);
      confirmResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.status).toBe('CONFIRMED');
          expect(value.data.movementId).toBeDefined();
          expect(value.data.confirmedAt).toBeDefined();
        },
        () => {
          throw new Error('Sale confirmation should succeed');
        }
      );

      // Assert - Step 3: Movement generated from sale
      const confirmedSale = await saleRepository.findById(saleId!, testOrgId);
      expect(confirmedSale?.movementId).toBeDefined();

      const movement = await movementRepository.findById(confirmedSale!.movementId!, testOrgId);
      expect(movement).not.toBeNull();
      expect(movement?.type.getValue()).toBe('OUT');
      expect(movement?.reference).toBe(confirmedSale?.saleNumber.getValue());

      // Assert - Step 4: Stock updated correctly
      const updatedStock = await prisma.stock.findFirst({
        where: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          locationId: testLocationId,
          orgId: testOrgId,
        },
      });
      expect(updatedStock).not.toBeNull();
      expect(updatedStock?.quantity).toBe(90); // 100 - 10
    });

    it('Given: insufficient stock When: confirming sale Then: should return BusinessRuleError', async () => {
      // Arrange - Stock with insufficient quantity
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
      const createResult = await createSaleUseCase.execute({
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
      createResult.match(
        value => {
          saleId = value.data.id;
        },
        () => {
          throw new Error('Sale creation should succeed');
        }
      );

      // Act - Try to confirm sale
      const confirmResult = await confirmSaleUseCase.execute({
        id: saleId!,
        orgId: testOrgId,
      });

      // Assert - Confirmation should fail
      expect(confirmResult.isErr()).toBe(true);
      confirmResult.match(
        () => {
          throw new Error('Sale confirmation should fail');
        },
        error => {
          expect(error.message).toContain('stock');
        }
      );
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-sale-acceptance',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-sale@test.com',
        username: 'testusersale',
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
      code: 'WH-SALE-ACCEPT-001',
      name: 'Sale Acceptance Warehouse',
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
        code: 'LOC-SALE-001',
        name: 'Location 1',
        warehouseId: testWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
    testLocationId = location.id;

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-SALE-ACCEPT-001',
      name: 'Sale Acceptance Product',
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
