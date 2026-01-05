// Return Flow Acceptance Test
// Acceptance test for complete return flow following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { CreateReturnUseCase } from '@application/returnUseCases/createReturnUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMovementRepository } from '@infrastructure/database/repositories/movement.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsModule } from '@returns/returns.module';
import { SalesModule } from '@sales/sales.module';

import type { IReturnRepository } from '@returns/domain/ports/repositories';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Return Flow Acceptance Test
 *
 * This test verifies the complete business flow of a return:
 * 1. User creates return for confirmed sale
 * 2. System validates sale association
 * 3. Return is confirmed
 * 4. Movement is generated from return
 * 5. Stock is updated correctly
 */
describeIf(!!process.env.DATABASE_URL)('Return Flow Acceptance Test', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createReturnUseCase: CreateReturnUseCase;
  let confirmReturnUseCase: ConfirmReturnUseCase;
  let createSaleUseCase: CreateSaleUseCase;
  let confirmSaleUseCase: ConfirmSaleUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let returnRepository: IReturnRepository;
  let movementRepository: PrismaMovementRepository;

  const testOrgId = 'test-org-return-acceptance';
  let testWarehouseId: string;
  let testProductId: string;
  let testLocationId: string;
  let testUserId: string;
  let testSaleId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule, SalesModule, ReturnsModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createReturnUseCase = module.get<CreateReturnUseCase>(CreateReturnUseCase);
    confirmReturnUseCase = module.get<ConfirmReturnUseCase>(ConfirmReturnUseCase);
    createSaleUseCase = module.get<CreateSaleUseCase>(CreateSaleUseCase);
    confirmSaleUseCase = module.get<ConfirmSaleUseCase>(ConfirmSaleUseCase);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);
    returnRepository = module.get<IReturnRepository>('ReturnRepository');
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

  describe('Complete Return Scenario', () => {
    it('Given: confirmed sale with stock When: creating and confirming return Then: return created, sale validated, movement generated, stock updated', async () => {
      // Arrange - Stock and confirmed sale
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 100,
          unitCost: 50,
          orgId: testOrgId,
        },
      });

      // Create and confirm sale
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

      saleResult.match(
        value => {
          testSaleId = value.data.id;
        },
        () => {
          throw new Error('Sale creation failed');
        }
      );

      await confirmSaleUseCase.execute({
        id: testSaleId,
        orgId: testOrgId,
      });

      const returnData = {
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: testSaleId,
        reason: 'DEFECTIVE',
        note: 'Acceptance test return',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 2,
            originalSalePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act - Step 1: Create return
      const createResult = await createReturnUseCase.execute(returnData);

      // Assert - Step 1: Return created successfully
      expect(createResult.isOk()).toBe(true);
      let returnId: string;
      createResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.type).toBe('RETURN_CUSTOMER');
          expect(value.data.saleId).toBe(testSaleId);
          expect(value.data.status).toBe('DRAFT');
          returnId = value.data.id;
        },
        () => {
          throw new Error('Return creation should succeed');
        }
      );

      // Act - Step 2: Confirm return
      const confirmResult = await confirmReturnUseCase.execute({
        id: returnId!,
        orgId: testOrgId,
      });

      // Assert - Step 2: Return confirmed successfully
      expect(confirmResult.isOk()).toBe(true);
      confirmResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.status).toBe('CONFIRMED');
          expect(value.data.returnMovementId).toBeDefined();
          expect(value.data.confirmedAt).toBeDefined();
        },
        () => {
          throw new Error('Return confirmation should succeed');
        }
      );

      // Assert - Step 3: Movement generated from return
      const confirmedReturn = await returnRepository.findById(returnId!, testOrgId);
      expect(confirmedReturn?.returnMovementId).toBeDefined();

      const movement = await movementRepository.findById(
        confirmedReturn!.returnMovementId!,
        testOrgId
      );
      expect(movement).not.toBeNull();
      expect(movement?.type.getValue()).toBe('IN'); // Customer returns generate IN movements
      expect(movement?.reference).toBe(confirmedReturn?.returnNumber.getValue());

      // Assert - Step 4: Stock updated correctly
      const updatedStock = await prisma.stock.findFirst({
        where: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          orgId: testOrgId,
        },
      });
      expect(updatedStock).not.toBeNull();
      // Stock should be: 100 (initial) - 10 (sale) + 2 (return) = 92
      expect(updatedStock?.quantity).toBe(92);
    });

    it('Given: return quantity exceeding sale When: confirming return Then: should return BusinessRuleError', async () => {
      // Arrange - Stock and confirmed sale
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 100,
          unitCost: 50,
          orgId: testOrgId,
        },
      });

      // Create and confirm sale with quantity 10
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

      await confirmSaleUseCase.execute({
        id: saleId!,
        orgId: testOrgId,
      });

      // Create return with quantity exceeding sale (15 > 10)
      const returnResult = await createReturnUseCase.execute({
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: saleId!,
        reason: 'DEFECTIVE',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 15, // More than sale quantity
            originalSalePrice: 100,
            currency: 'COP',
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      let returnId: string;
      returnResult.match(
        value => {
          returnId = value.data.id;
        },
        () => {
          throw new Error('Return creation failed');
        }
      );

      // Act - Try to confirm return
      const confirmResult = await confirmReturnUseCase.execute({
        id: returnId!,
        orgId: testOrgId,
      });

      // Assert - Confirmation should fail
      expect(confirmResult.isErr()).toBe(true);
      confirmResult.match(
        () => {
          throw new Error('Return confirmation should fail');
        },
        error => {
          expect(error.message).toContain('quantity');
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
        slug: 'test-org-return-acceptance',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-return@test.com',
        username: 'testuserreturn',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testUserId = user.id;

    // Create warehouse
    const warehouseResult = await createWarehouseUseCase.execute({
      code: 'WH-RETURN-ACCEPT-001',
      name: 'Return Acceptance Warehouse',
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

    // Set location ID (locations are optional in the schema)
    testLocationId = 'loc-return-001';

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-RETURN-ACCEPT-001',
      name: 'Return Acceptance Product',
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
      await prisma.returnLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.return.deleteMany({
        where: { orgId: testOrgId },
      });
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
