import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Products Performance Tests
 *
 * These tests verify performance requirements for product endpoints:
 * - GET /products - < 200ms with 100 products
 * - GET /products with filters - < 300ms
 * - GET /products with pagination - < 200ms
 *
 * Note: These tests require a database with test data.
 * They can be skipped if DATABASE_URL is not set.
 */
describeIf(!!process.env.DATABASE_URL)('Products Performance Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-performance';
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule, InventoryHttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  describe('GET /inventory/products Performance', () => {
    it('Given: 100 products When: getting products list Then: should respond in less than 200ms', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(200); // 200ms threshold
    });

    it('Given: products with filters When: getting filtered products Then: should respond in less than 300ms', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products?status=ACTIVE&page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(300); // 300ms threshold
    });

    it('Given: products with pagination When: getting paginated products Then: should respond in less than 200ms', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(200); // 200ms threshold
    });
  });

  describe('GET /inventory/products/:id Performance', () => {
    it('Given: existing product When: getting product by ID Then: should respond in less than 100ms', async () => {
      // Arrange
      const product = await prismaService.product.findFirst({
        where: { orgId: testOrgId },
      });
      if (!product) {
        return; // Skip if no products
      }

      const startTime = Date.now();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/inventory/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(100); // 100ms threshold
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prismaService.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-performance',
        isActive: true,
      },
    });

    // Create admin user
    await prismaService.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        passwordHash: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Create 100 products for performance testing
    const products = Array.from({ length: 100 }, (_, i) => ({
      sku: `PROD-PERF-${String(i + 1).padStart(3, '0')}`,
      name: `Performance Test Product ${i + 1}`,
      unit: 'UNIT',
      orgId: testOrgId,
      isActive: true,
      costMethod: 'AVG',
    }));

    await prismaService.product.createMany({
      data: products,
    });

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Organization-ID', testOrgId)
      .send({
        email: 'admin@test.com',
        password: 'ValidPass123!',
      });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.body.data?.tokens?.accessToken || 'mock-token';
    }
  }

  async function cleanupTestData() {
    if (!prismaService) {
      return;
    }

    try {
      await prismaService.product.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.user.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.organization.deleteMany({
        where: { id: testOrgId },
      });
    } catch (_error) {
      // Ignore cleanup errors
    }
  }
});
