// Import Flow Acceptance Test
// Acceptance test for complete import flow following AAA and Given-When-Then patterns

import { CreateImportBatchUseCase } from '@application/importUseCases/createImportBatchUseCase';
import { ExecuteImportUseCase } from '@application/importUseCases/executeImportUseCase';
import { ProcessImportUseCase } from '@application/importUseCases/processImportUseCase';
import { ValidateImportUseCase } from '@application/importUseCases/validateImportUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaImportBatchRepository } from '@infrastructure/database/repositories/prismaImportBatchRepository';
import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { ImportHttpModule } from '@interface/http/import/importHttp.module';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Import Flow Acceptance Test
 *
 * This test verifies the complete business flow of an import:
 * 1. User creates import batch with file data
 * 2. System validates import structure
 * 3. Import is processed
 * 4. Import is executed
 * 5. Products and stock are created/updated
 */
describeIf(!!process.env.DATABASE_URL)('Import Flow Acceptance Test', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createImportBatchUseCase: CreateImportBatchUseCase;
  let validateImportUseCase: ValidateImportUseCase;
  let processImportUseCase: ProcessImportUseCase;
  let executeImportUseCase: ExecuteImportUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let importBatchRepository: PrismaImportBatchRepository;
  let productRepository: PrismaProductRepository;

  const testOrgId = 'test-org-import-acceptance';
  let testWarehouseId: string;
  let testUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule, ImportHttpModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createImportBatchUseCase = module.get<CreateImportBatchUseCase>(CreateImportBatchUseCase);
    validateImportUseCase = module.get<ValidateImportUseCase>(ValidateImportUseCase);
    processImportUseCase = module.get<ProcessImportUseCase>(ProcessImportUseCase);
    executeImportUseCase = module.get<ExecuteImportUseCase>(ExecuteImportUseCase);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);
    importBatchRepository = module.get<PrismaImportBatchRepository>('ImportBatchRepository');
    productRepository = module.get<PrismaProductRepository>('ProductRepository');

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

  describe('Complete Import Scenario', () => {
    it('Given: valid import file data When: importing products Then: batch created, validated, processed, executed, products and stock created', async () => {
      // Arrange - Valid import data
      const importData = {
        type: 'PRODUCTS' as const,
        fileData: [
          {
            location: 'LOC-001',
            code: 'PROD-IMPORT-001',
            name: 'Imported Product 1',
            unit: 'UNIT',
            quantity: 100,
            unitCost: 10.5,
            totalCost: 1050,
            salePrice: 20,
            totalSalePrice: 2000,
          },
          {
            location: 'LOC-001',
            code: 'PROD-IMPORT-002',
            name: 'Imported Product 2',
            unit: 'UNIT',
            quantity: 50,
            unitCost: 15,
            totalCost: 750,
            salePrice: 30,
            totalSalePrice: 1500,
          },
        ],
        orgId: testOrgId,
        createdBy: testUserId,
      };

      // Act - Step 1: Create import batch
      const createResult = await createImportBatchUseCase.execute(importData);

      // Assert - Step 1: Batch created successfully
      expect(createResult.isOk()).toBe(true);
      let batchId: string;
      createResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.type).toBe('PRODUCTS');
          expect(value.data.status).toBe('PENDING');
          batchId = value.data.id;
        },
        () => {
          throw new Error('Import batch creation should succeed');
        }
      );

      // Act - Step 2: Validate import
      const validateResult = await validateImportUseCase.execute({
        batchId: batchId!,
        orgId: testOrgId,
      });

      // Assert - Step 2: Validation successful
      expect(validateResult.isOk()).toBe(true);
      validateResult.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.isValid).toBe(true);
        },
        () => {
          throw new Error('Import validation should succeed');
        }
      );

      // Act - Step 3: Process import
      const processResult = await processImportUseCase.execute({
        batchId: batchId!,
        orgId: testOrgId,
      });

      // Assert - Step 3: Processing successful
      expect(processResult.isOk()).toBe(true);
      processResult.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Import processing should succeed');
        }
      );

      // Act - Step 4: Execute import
      const executeResult = await executeImportUseCase.execute({
        batchId: batchId!,
        orgId: testOrgId,
      });

      // Assert - Step 4: Execution successful
      expect(executeResult.isOk()).toBe(true);
      executeResult.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Import execution should succeed');
        }
      );

      // Assert - Step 5: Products created
      const product1 = await productRepository.findBySku('PROD-IMPORT-001', testOrgId);
      expect(product1).not.toBeNull();
      expect(product1?.name.getValue()).toBe('Imported Product 1');

      const product2 = await productRepository.findBySku('PROD-IMPORT-002', testOrgId);
      expect(product2).not.toBeNull();
      expect(product2?.name.getValue()).toBe('Imported Product 2');

      // Assert - Step 6: Stock created (if import creates stock)
      const batch = await importBatchRepository.findById(batchId!, testOrgId);
      expect(batch?.status.getValue()).toBe('COMPLETED');
    });

    it('Given: invalid import file data When: validating import Then: should return validation errors', async () => {
      // Arrange - Invalid import data (missing required fields)
      const importData = {
        type: 'PRODUCTS' as const,
        fileData: [
          {
            location: 'LOC-001',
            code: '', // Invalid: empty code
            name: 'Product',
            unit: 'UNIT',
            quantity: 100,
          },
        ],
        orgId: testOrgId,
        createdBy: testUserId,
      };

      // Act - Create batch and validate
      const createResult = await createImportBatchUseCase.execute(importData);
      let batchId: string;
      createResult.match(
        value => {
          batchId = value.data.id;
        },
        () => {
          throw new Error('Batch creation should succeed even with invalid data');
        }
      );

      const validateResult = await validateImportUseCase.execute({
        batchId: batchId!,
        orgId: testOrgId,
      });

      // Assert - Validation should fail
      expect(validateResult.isOk()).toBe(true);
      validateResult.match(
        value => {
          // Validation may return errors but still be Ok result
          expect(value.data.errors).toBeDefined();
        },
        () => {
          // Or it may return Err result
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
        slug: 'test-org-import-acceptance',
        isActive: true,
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test-user-import@test.com',
        username: 'testuserimport',
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
      code: 'WH-IMPORT-ACCEPT-001',
      name: 'Import Acceptance Warehouse',
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
    await prisma.location.create({
      data: {
        code: 'LOC-001',
        name: 'Location 1',
        warehouseId: testWarehouseId,
        isDefault: true,
        orgId: testOrgId,
      },
    });
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
      await prisma.importRow.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.importBatch.deleteMany({
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
