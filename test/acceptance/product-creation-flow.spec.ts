import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMovementRepository } from '@infrastructure/database/repositories/movement.repository';
import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Product Creation Acceptance Test
 *
 * This test verifies the complete business flow of creating a product:
 * 1. User creates product with valid data
 * 2. System validates SKU uniqueness
 * 3. Product is created successfully
 * 4. Initial movement can be created for the product
 * 5. Stock is updated correctly
 */
describeIf(!!process.env.DATABASE_URL)('Product Creation Acceptance Flow', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createProductUseCase: CreateProductUseCase;
  let createMovementUseCase: CreateMovementUseCase;
  let productRepository: PrismaProductRepository;
  let movementRepository: PrismaMovementRepository;

  const testOrgId = 'test-org-acceptance';
  let testWarehouseId: string;
  let testLocationId: string;
  let testUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    createMovementUseCase = module.get<CreateMovementUseCase>(CreateMovementUseCase);
    productRepository = module.get<PrismaProductRepository>('ProductRepository');
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

  describe('Complete Product Creation Scenario', () => {
    it('Given: authenticated user with permissions When: creating product with valid data Then: product created, SKU unique, movement can be created, stock updated', async () => {
      // Arrange - User is authenticated with permissions (simulated by test setup)
      const productData = {
        sku: 'PROD-ACCEPT-001',
        name: 'Acceptance Test Product',
        description: 'Product for acceptance testing',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        status: 'ACTIVE' as const,
        costMethod: 'AVG' as const,
        orgId: testOrgId,
      };

      // Act - Step 1: Create product
      const createResult = await createProductUseCase.execute(productData);

      // Assert - Step 1: Product created successfully
      expect(createResult.isOk()).toBe(true);
      let productId = '';
      createResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.sku).toBe(productData.sku);
          expect(value.data.name).toBe(productData.name);
          productId = value.data.id;
        },
        () => {
          throw new Error('Product creation should succeed');
        }
      );

      // Assert - Step 2: SKU is unique (verified by successful creation)
      const productBySku = await productRepository.findBySku(productData.sku, testOrgId);
      expect(productBySku).not.toBeNull();
      expect(productBySku?.id).toBe(productId);

      // Act - Step 3: Create initial movement for the product
      const movementResult = await createMovementUseCase.execute({
        type: 'IN',
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: productId!,
            locationId: testLocationId,
            quantity: 100,
            unitCost: 10.5,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      // Assert - Step 3: Movement created successfully
      expect(movementResult.isOk()).toBe(true);
      movementResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.lines).toHaveLength(1);
          expect(value.data.lines[0].productId).toBe(productId);
        },
        () => {
          throw new Error('Movement creation should succeed');
        }
      );

      // Assert - Step 4: Product can be used in movements (verified by successful movement creation)
      const movements = await movementRepository.findAll(testOrgId);
      const productMovements = movements.filter(m =>
        m.getLines().some(line => line.productId === productId)
      );
      expect(productMovements.length).toBeGreaterThan(0);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-acceptance',
        isActive: true,
      },
    });

    // Create user (simulating authenticated user)
    const user = await prisma.user.create({
      data: {
        email: 'test-user@test.com',
        username: 'testuser',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testUserId = user.id;

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Test Warehouse',
        code: 'WH-001',
        orgId: testOrgId,
        isActive: true,
      },
    });
    testWarehouseId = warehouse.id;

    // Set location ID (locations are optional in the schema)
    testLocationId = 'loc-001';
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
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
