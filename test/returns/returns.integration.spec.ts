/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: This test needs to be updated to match the current schema
// Returns Integration Tests
// Integration tests for returns flows following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { CreateReturnUseCase } from '@application/returnUseCases/createReturnUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaReturnRepository } from '@infrastructure/database/repositories/return.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsModule } from '@returns/returns.module';
import { SalesModule } from '@sales/sales.module';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Returns Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createReturnUseCase: CreateReturnUseCase;
  let confirmReturnUseCase: ConfirmReturnUseCase;
  let createSaleUseCase: CreateSaleUseCase;
  let confirmSaleUseCase: ConfirmSaleUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let returnRepository: PrismaReturnRepository;

  const testOrgId = 'test-org-returns-integration';
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
    returnRepository = module.get<PrismaReturnRepository>('ReturnRepository');

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

  describe('Customer Return Creation Flow', () => {
    it('Given: confirmed sale When: creating customer return Then: should create return with sale association', async () => {
      // Arrange - Create stock
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

      // Act - Create return
      const returnData = {
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: saleId!,
        reason: 'DEFECTIVE',
        note: 'Customer return',
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

      const result = await createReturnUseCase.execute(returnData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.type).toBe('RETURN_CUSTOMER');
          expect(value.data.saleId).toBe(saleId);
          expect(value.data.status).toBe('DRAFT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent sale When: creating customer return Then: should return NotFoundError', async () => {
      // Arrange
      const returnData = {
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: 'non-existent-sale',
        lines: [],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act
      const result = await createReturnUseCase.execute(returnData);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('Sale');
        }
      );
    });
  });

  describe('Return Confirmation Flow', () => {
    it('Given: draft customer return When: confirming return Then: should confirm return and generate movement', async () => {
      // Arrange - Create stock
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

      // Create return
      const returnResult = await createReturnUseCase.execute({
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: saleId!,
        reason: 'DEFECTIVE',
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

      // Act
      const result = await confirmReturnUseCase.execute({
        id: returnId!,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('CONFIRMED');
          expect(value.data.returnMovementId).toBeDefined();
          expect(value.data.confirmedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify movement was created
      const confirmedReturn = await returnRepository.findById(returnId!, testOrgId);
      expect(confirmedReturn?.returnMovementId).toBeDefined();
    });

    it('Given: return with quantity exceeding sale When: confirming return Then: should return BusinessRuleError', async () => {
      // Arrange - Create stock
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

      // Act
      const result = await confirmReturnUseCase.execute({
        id: returnId!,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('quantity');
        }
      );
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('Given: returns in different organizations When: querying returns Then: should only return returns from correct organization', async () => {
      // Arrange - Create stock
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

      // Create return
      await createReturnUseCase.execute({
        type: 'RETURN_CUSTOMER' as const,
        warehouseId: testWarehouseId,
        saleId: saleId!,
        reason: 'DEFECTIVE',
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
      });

      // Act - Query returns for testOrgId
      const returns = await returnRepository.findAll(testOrgId);

      // Assert
      expect(returns.data.every(r => r.orgId === testOrgId)).toBe(true);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-returns',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-returns@test.com',
        username: 'testuserreturns',
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
      code: 'WH-RETURNS-001',
      name: 'Returns Test Warehouse',
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
        code: 'LOC-RETURNS-001',
        name: 'Location 1',
        warehouseId: testWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
    testLocationId = location.id;

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-RETURNS-001',
      name: 'Returns Test Product',
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

    // Create stock
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

    // Create and confirm sale for test
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
        // Ignore if sale creation fails
      }
    );

    if (testSaleId) {
      await confirmSaleUseCase.execute({
        id: testSaleId,
        orgId: testOrgId,
      });
    }
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
