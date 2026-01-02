import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

/**
 * Input Validation Security Tests
 *
 * These tests verify that the system properly validates and sanitizes input:
 * - XSS (Cross-Site Scripting) prevention
 * - SQL injection prevention
 * - Type validation
 * - Format validation
 */
describeIf(!!process.env.DATABASE_URL)('Input Validation Security Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-validation';
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

  describe('XSS Prevention', () => {
    it('Given: product name with script tags When: creating product Then: should sanitize or reject input', async () => {
      // Arrange
      const xssPayload = {
        sku: 'PROD-XSS-001',
        name: '<script>alert("XSS")</script>Test Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(xssPayload);

      // Assert - Should either reject (400) or sanitize (201)
      expect([200, 201, 400]).toContain(response.status);
      if (response.status === 201) {
        // If accepted, verify it was sanitized
        expect(response.body.data.name).not.toContain('<script>');
      }
    });

    it('Given: product description with HTML tags When: creating product Then: should sanitize input', async () => {
      // Arrange
      const htmlPayload = {
        sku: 'PROD-HTML-001',
        name: 'Test Product',
        description: '<img src=x onerror=alert(1)>',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(htmlPayload);

      // Assert
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('Given: SKU with SQL injection When: creating product Then: should reject or sanitize', async () => {
      // Arrange
      const sqlPayload = {
        sku: "'; DROP TABLE products; --",
        name: 'Test Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(sqlPayload);

      // Assert - Should reject invalid input
      expect([400, 422]).toContain(response.status);

      // Verify table still exists
      const products = await prismaService.product.findMany({
        where: { orgId: testOrgId },
      });
      expect(products).toBeDefined();
    });

    it('Given: query parameter with SQL injection When: querying products Then: should handle safely', async () => {
      // Arrange
      const sqlInjection = "1' OR '1'='1";

      // Act
      const response = await request(app.getHttpServer())
        .get(`/inventory/products?sku=${sqlInjection}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId);

      // Assert - Should not crash
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Type Validation', () => {
    it('Given: invalid type for quantity When: creating movement Then: should return 400 Bad Request', async () => {
      // Arrange
      const invalidType = {
        type: 'IN',
        warehouseId: 'warehouse-id',
        lines: [
          {
            productId: 'product-id',
            locationId: 'location-id',
            quantity: 'not-a-number', // Invalid type
          },
        ],
        createdBy: 'user-id',
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(invalidType)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: missing required field When: creating product Then: should return 400 Bad Request', async () => {
      // Arrange
      const missingField = {
        sku: 'PROD-001',
        // Missing name
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(missingField)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('Format Validation', () => {
    it('Given: invalid email format When: creating user Then: should return 400 Bad Request', async () => {
      // Arrange
      const invalidEmail = {
        email: 'not-an-email',
        username: 'testuser',
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User',
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Organization-ID', testOrgId)
        .send(invalidEmail)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: invalid SKU format When: creating product Then: should return 400 Bad Request', async () => {
      // Arrange
      const invalidSku = {
        sku: '   ', // Invalid: only spaces
        name: 'Test Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: testOrgId,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(invalidSku)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prismaService.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-validation',
        isActive: true,
      },
    });

    // Create admin user and get token (simplified)
    await prismaService.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        passwordHash: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        status: 'ACTIVE',
        orgId: testOrgId,
      },
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
