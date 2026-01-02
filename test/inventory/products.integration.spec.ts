import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { UpdateProductUseCase } from '@application/productUseCases/updateProductUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Products Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let createProductUseCase: CreateProductUseCase;
  let updateProductUseCase: UpdateProductUseCase;
  let productRepository: PrismaProductRepository;

  const testOrgId = 'test-org-products-integration';
  let testProductId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    updateProductUseCase = module.get<UpdateProductUseCase>(UpdateProductUseCase);
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

  describe('Product Creation Flow', () => {
    it('Given: valid product data When: creating product Then: should create product with unique SKU', async () => {
      // Arrange
      const productData = {
        sku: 'PROD-INT-001',
        name: 'Integration Test Product',
        description: 'Product for integration testing',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        status: 'ACTIVE' as const,
        costMethod: 'AVG' as const,
        orgId: testOrgId,
      };

      // Act
      const result = await createProductUseCase.execute(productData);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.sku).toBe(productData.sku);
          expect(value.data.name).toBe(productData.name);
          expect(value.data.orgId).toBe(testOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify in database
      const savedProduct = await productRepository.findBySku(productData.sku, testOrgId);
      expect(savedProduct).not.toBeNull();
      expect(savedProduct?.sku.getValue()).toBe(productData.sku);
    });

    it('Given: duplicate SKU When: creating product Then: should return ConflictError', async () => {
      // Arrange
      const productData = {
        sku: 'PROD-INT-002',
        name: 'Test Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Create first product
      await createProductUseCase.execute(productData);

      // Act - Try to create duplicate
      const result = await createProductUseCase.execute(productData);

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
  });

  describe('Product Update Flow', () => {
    it('Given: existing product When: updating product Then: should update product successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Product Name',
        description: 'Updated description',
      };

      // Act
      const result = await updateProductUseCase.execute({
        id: testProductId,
        ...updateData,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.name).toBe(updateData.name);
          expect(value.data.description).toBe(updateData.description);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify in database
      const updatedProduct = await productRepository.findById(testProductId, testOrgId);
      expect(updatedProduct?.name.getValue()).toBe(updateData.name);
    });
  });

  describe('Product Deactivation Flow', () => {
    it('Given: active product When: deactivating product Then: should deactivate product', async () => {
      // Arrange
      const updateData = {
        status: 'INACTIVE' as const,
      };

      // Act
      const result = await updateProductUseCase.execute({
        id: testProductId,
        ...updateData,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('INACTIVE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Verify in database
      const deactivatedProduct = await productRepository.findById(testProductId, testOrgId);
      expect(deactivatedProduct?.status.getValue()).toBe('INACTIVE');
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-products',
        isActive: true,
      },
    });

    // Create user (not used in current tests but may be needed for future tests)
    await prisma.user.create({
      data: {
        email: 'test-user@test.com',
        username: 'testuser',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        status: 'ACTIVE',
        orgId: testOrgId,
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        sku: 'PROD-TEST-001',
        name: 'Test Product',
        unit: 'UNIT',
        orgId: testOrgId,
        isActive: true,
        costMethod: 'AVG',
      },
    });
    testProductId = product.id;
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
      await prisma.product.deleteMany({
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
