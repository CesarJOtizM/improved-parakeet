// Transfer Flow Acceptance Test
// Acceptance test for complete transfer flow following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaTransferRepository } from '@infrastructure/database/repositories/transfer.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Transfer Flow Acceptance Test
 *
 * This test verifies the complete business flow of a transfer:
 * 1. User initiates transfer with valid data
 * 2. System validates stock in origin warehouse
 * 3. Transfer is created with IN_TRANSIT status
 * 4. Transfer can be received (simulated by checking entity methods)
 */
describeIf(!!process.env.DATABASE_URL)('Transfer Flow Acceptance Test', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let initiateTransferUseCase: InitiateTransferUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let transferRepository: PrismaTransferRepository;

  const testOrgId = 'test-org-transfer-acceptance';
  let testFromWarehouseId: string;
  let testToWarehouseId: string;
  let testProductId: string;
  let testFromLocationId: string;
  let testToLocationId: string;
  let testUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    initiateTransferUseCase = module.get<InitiateTransferUseCase>(InitiateTransferUseCase);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);
    transferRepository = module.get<PrismaTransferRepository>('TransferRepository');

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

  describe('Complete Transfer Scenario', () => {
    it('Given: authenticated user with stock in origin When: initiating transfer Then: transfer created, stock validated, status IN_TRANSIT', async () => {
      // Arrange - Stock in origin warehouse
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testFromWarehouseId,
          locationId: testFromLocationId,
          quantity: 100,
          averageCost: 50,
          currency: 'COP',
          orgId: testOrgId,
        },
      });

      const transferData = {
        fromWarehouseId: testFromWarehouseId,
        toWarehouseId: testToWarehouseId,
        note: 'Acceptance test transfer',
        lines: [
          {
            productId: testProductId,
            quantity: 20,
            fromLocationId: testFromLocationId,
            toLocationId: testToLocationId,
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      };

      // Act - Step 1: Initiate transfer
      const initiateResult = await initiateTransferUseCase.execute(transferData);

      // Assert - Step 1: Transfer initiated successfully
      expect(initiateResult.isOk()).toBe(true);
      let transferId: string;
      initiateResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.status).toBe('IN_TRANSIT');
          expect(value.data.fromWarehouseId).toBe(testFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(testToWarehouseId);
          transferId = value.data.id;
        },
        () => {
          throw new Error('Transfer initiation should succeed');
        }
      );

      // Assert - Step 2: Transfer can be received (validate entity state)
      const transfer = await transferRepository.findById(transferId!, testOrgId);
      expect(transfer).not.toBeNull();
      expect(transfer?.status.canReceive()).toBe(true);
      expect(transfer?.getLines().length).toBeGreaterThan(0);
    });

    it('Given: insufficient stock in origin When: initiating transfer Then: should return BusinessRuleError', async () => {
      // Arrange - Stock with insufficient quantity
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testFromWarehouseId,
          locationId: testFromLocationId,
          quantity: 5, // Less than transfer quantity
          averageCost: 50,
          currency: 'COP',
          orgId: testOrgId,
        },
      });

      // Act - Try to initiate transfer
      const result = await initiateTransferUseCase.execute({
        fromWarehouseId: testFromWarehouseId,
        toWarehouseId: testToWarehouseId,
        lines: [
          {
            productId: testProductId,
            quantity: 20, // More than available stock
            fromLocationId: testFromLocationId,
            toLocationId: testToLocationId,
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      // Assert - Transfer initiation should fail
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Transfer initiation should fail');
        },
        error => {
          expect(error.message).toContain('stock');
        }
      );
    });

    it('Given: same warehouse for origin and destination When: initiating transfer Then: should return ValidationError', async () => {
      // Arrange
      await prisma.stock.create({
        data: {
          productId: testProductId,
          warehouseId: testFromWarehouseId,
          locationId: testFromLocationId,
          quantity: 100,
          averageCost: 50,
          currency: 'COP',
          orgId: testOrgId,
        },
      });

      // Act - Try to initiate transfer with same warehouse
      const result = await initiateTransferUseCase.execute({
        fromWarehouseId: testFromWarehouseId,
        toWarehouseId: testFromWarehouseId, // Same warehouse
        lines: [
          {
            productId: testProductId,
            quantity: 20,
            fromLocationId: testFromLocationId,
            toLocationId: testToLocationId,
          },
        ],
        createdBy: testUserId,
        orgId: testOrgId,
      });

      // Assert - Transfer initiation should fail
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Transfer initiation should fail');
        },
        error => {
          expect(error.message).toBeDefined();
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
        slug: 'test-org-transfer-acceptance',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-transfer@test.com',
        username: 'testusertransfer',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        status: 'ACTIVE',
        orgId: testOrgId,
      },
    });
    testUserId = user.id;

    // Create from warehouse
    const fromWarehouseResult = await createWarehouseUseCase.execute({
      code: 'WH-FROM-001',
      name: 'From Warehouse',
      isActive: true,
      orgId: testOrgId,
    });

    fromWarehouseResult.match(
      value => {
        testFromWarehouseId = value.data.id;
      },
      () => {
        throw new Error('From warehouse creation failed');
      }
    );

    // Create to warehouse
    const toWarehouseResult = await createWarehouseUseCase.execute({
      code: 'WH-TO-001',
      name: 'To Warehouse',
      isActive: true,
      orgId: testOrgId,
    });

    toWarehouseResult.match(
      value => {
        testToWarehouseId = value.data.id;
      },
      () => {
        throw new Error('To warehouse creation failed');
      }
    );

    // Create locations
    const fromLocation = await prisma.location.create({
      data: {
        code: 'LOC-FROM-001',
        name: 'From Location',
        warehouseId: testFromWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
    testFromLocationId = fromLocation.id;

    const toLocation = await prisma.location.create({
      data: {
        code: 'LOC-TO-001',
        name: 'To Location',
        warehouseId: testToWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
    testToLocationId = toLocation.id;

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-TRANSFER-ACCEPT-001',
      name: 'Transfer Acceptance Product',
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
      await prisma.transferLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.transfer.deleteMany({
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
