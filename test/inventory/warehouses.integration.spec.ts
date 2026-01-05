// Warehouses Integration Tests
// Integration tests for warehouse flows following AAA and Given-When-Then patterns

import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaWarehouseRepository } from '@infrastructure/database/repositories/warehouse.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Warehouses Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createWarehouseUseCase: CreateWarehouseUseCase;
  let getWarehousesUseCase: GetWarehousesUseCase;
  let warehouseRepository: PrismaWarehouseRepository;

  const testOrgId = 'test-org-warehouses-integration';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);
    getWarehousesUseCase = module.get<GetWarehousesUseCase>(GetWarehousesUseCase);
    warehouseRepository = module.get<PrismaWarehouseRepository>('WarehouseRepository');

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

  describe('Warehouse Creation Flow', () => {
    it('Given: valid warehouse data When: creating warehouse Then: should create warehouse with unique code', async () => {
      // Arrange
      const warehouseData = {
        code: 'WH-INT-001',
        name: 'Integration Test Warehouse',
        description: 'Warehouse for integration testing',
        isActive: true,
        orgId: testOrgId,
      };

      // Act
      const result = await createWarehouseUseCase.execute(warehouseData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.code).toBe(warehouseData.code);
          expect(value.data.name).toBe(warehouseData.name);
          expect(value.data.orgId).toBe(testOrgId);
          expect(value.data.isActive).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify in database
      const savedWarehouse = await warehouseRepository.findByCode(warehouseData.code, testOrgId);
      expect(savedWarehouse).not.toBeNull();
      expect(savedWarehouse?.code.getValue()).toBe(warehouseData.code);
    });

    it('Given: warehouse with address When: creating warehouse Then: should create warehouse with address', async () => {
      // Arrange
      const warehouseData = {
        code: 'WH-INT-002',
        name: 'Warehouse with Address',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        isActive: true,
        orgId: testOrgId,
      };

      // Act
      const result = await createWarehouseUseCase.execute(warehouseData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.address).toBeDefined();
          expect(value.data.address?.street).toBe(warehouseData.address.street);
          expect(value.data.address?.city).toBe(warehouseData.address.city);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: duplicate warehouse code When: creating warehouse Then: should return ConflictError', async () => {
      // Arrange
      const warehouseData = {
        code: 'WH-INT-003',
        name: 'Test Warehouse',
        isActive: true,
        orgId: testOrgId,
      };

      // Create first warehouse
      await createWarehouseUseCase.execute(warehouseData);

      // Act - Try to create duplicate
      const result = await createWarehouseUseCase.execute(warehouseData);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('already exists');
        }
      );
    });

    it('Given: invalid warehouse code When: creating warehouse Then: should return ValidationError', async () => {
      // Arrange
      const warehouseData = {
        code: '', // Invalid empty code
        name: 'Test Warehouse',
        isActive: true,
        orgId: testOrgId,
      };

      // Act
      const result = await createWarehouseUseCase.execute(warehouseData);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('Invalid');
        }
      );
    });
  });

  describe('Warehouse Query Flow', () => {
    it('Given: existing warehouses When: getting all warehouses Then: should return all warehouses', async () => {
      // Arrange - Create multiple warehouses
      await createWarehouseUseCase.execute({
        code: 'WH-QUERY-001',
        name: 'Warehouse 1',
        isActive: true,
        orgId: testOrgId,
      });
      await createWarehouseUseCase.execute({
        code: 'WH-QUERY-002',
        name: 'Warehouse 2',
        isActive: true,
        orgId: testOrgId,
      });

      // Act
      const result = await getWarehousesUseCase.execute({
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.length).toBeGreaterThanOrEqual(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: active and inactive warehouses When: filtering by active Then: should return only active warehouses', async () => {
      // Arrange
      await createWarehouseUseCase.execute({
        code: 'WH-ACTIVE-001',
        name: 'Active Warehouse',
        isActive: true,
        orgId: testOrgId,
      });
      await createWarehouseUseCase.execute({
        code: 'WH-INACTIVE-001',
        name: 'Inactive Warehouse',
        isActive: false,
        orgId: testOrgId,
      });

      // Act
      const result = await getWarehousesUseCase.execute({
        orgId: testOrgId,
        isActive: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.every(w => w.isActive)).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouses with different names When: searching by name Then: should return matching warehouses', async () => {
      // Arrange
      await createWarehouseUseCase.execute({
        code: 'WH-SEARCH-001',
        name: 'Main Warehouse',
        isActive: true,
        orgId: testOrgId,
      });
      await createWarehouseUseCase.execute({
        code: 'WH-SEARCH-002',
        name: 'Secondary Warehouse',
        isActive: true,
        orgId: testOrgId,
      });

      // Act
      const result = await getWarehousesUseCase.execute({
        orgId: testOrgId,
        search: 'Main',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.length).toBeGreaterThanOrEqual(1);
          expect(value.data.some(w => w.name.includes('Main'))).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: multiple warehouses When: paginating results Then: should return paginated results', async () => {
      // Arrange - Create multiple warehouses
      for (let i = 1; i <= 5; i++) {
        await createWarehouseUseCase.execute({
          code: `WH-PAGE-${i.toString().padStart(3, '0')}`,
          name: `Warehouse ${i}`,
          isActive: true,
          orgId: testOrgId,
        });
      }

      // Act
      const result = await getWarehousesUseCase.execute({
        orgId: testOrgId,
        page: 1,
        limit: 2,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.length).toBeLessThanOrEqual(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('Multi-tenant Isolation', () => {
    const otherOrgId = 'test-org-warehouses-other';

    it('Given: warehouses in different organizations When: querying warehouses Then: should only return warehouses from correct organization', async () => {
      // Arrange
      await createWarehouseUseCase.execute({
        code: 'WH-ORG1-001',
        name: 'Org 1 Warehouse',
        isActive: true,
        orgId: testOrgId,
      });

      // Create warehouse in other org
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
          slug: 'other-org',
          isActive: true,
        },
      });
      await createWarehouseUseCase.execute({
        code: 'WH-ORG2-001',
        name: 'Org 2 Warehouse',
        isActive: true,
        orgId: otherOrgId,
      });

      // Act
      const result = await getWarehousesUseCase.execute({
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.every(w => w.orgId === testOrgId)).toBe(true);
          expect(value.data.some(w => w.code === 'WH-ORG2-001')).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Cleanup
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
        slug: 'test-org-warehouses',
        isActive: true,
      },
    });

    // Create test warehouse (not used in current tests but may be needed for future tests)
    await createWarehouseUseCase.execute({
      code: 'WH-TEST-001',
      name: 'Test Warehouse',
      isActive: true,
      orgId: testOrgId,
    });
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
      await prisma.warehouse.deleteMany({
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
