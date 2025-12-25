import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Products Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-products-123';
  const adminEmail = 'admin-products@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule, InventoryHttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanupTestData();
    await setupTestData();
  });

  describe('POST /inventory/products', () => {
    it('Given: admin user and valid product data When: creating product Then: should return created product', async () => {
      // Arrange
      const createProductData = {
        sku: 'TEST-PROD-001',
        name: 'Test Product',
        description: 'Test product description',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        status: 'ACTIVE',
        costMethod: 'AVG',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createProductData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(createProductData.sku);
      expect(response.body.data.name).toBe(createProductData.name);
      expect(response.body.data.status).toBe(createProductData.status);
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: duplicate SKU When: creating product Then: should return conflict error', async () => {
      // Arrange
      const createProductData = {
        sku: 'TEST-PROD-001', // Same SKU as in setup
        name: 'Another Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createProductData)
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: no authentication token When: creating product Then: should return unauthorized error', async () => {
      // Arrange
      const createProductData = {
        sku: 'TEST-PROD-002',
        name: 'Test Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/products')
        .set('X-Organization-ID', testOrgId)
        .send(createProductData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /inventory/products', () => {
    it('Given: admin user When: getting products Then: should return paginated products list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBeDefined();
      expect(response.body.pagination.limit).toBeDefined();
      expect(response.body.pagination.total).toBeDefined();
    });

    it('Given: query parameters When: getting products Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products?page=1&limit=5&status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('Given: search parameter When: getting products Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products?search=TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /inventory/products/:id', () => {
    it('Given: valid product ID When: getting product Then: should return product details', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/inventory/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProductId);
      expect(response.body.data.sku).toBe('TEST-PROD-001');
    });

    it('Given: invalid product ID When: getting product Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/products/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /inventory/products/:id', () => {
    it('Given: valid product ID and update data When: updating product Then: should return updated product', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Product Name',
        description: 'Updated description',
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/inventory/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('Given: invalid product ID When: updating product Then: should return not found error', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Product Name',
      };

      // Act
      const response = await request(app.getHttpServer())
        .put('/inventory/products/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(updateData)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  // Helper functions
  async function setupTestData() {
    const hashedPassword = await AuthenticationService.hashPassword(adminPassword);

    // Create organization
    await prismaService.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
        isActive: true,
      },
    });

    // Create ADMIN role
    const adminRole = await prismaService.role.create({
      data: {
        name: 'ADMIN',
        description: 'Admin role',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Create PRODUCTS permissions
    const productsCreatePermission = await prismaService.permission.create({
      data: {
        name: 'PRODUCTS:CREATE',
        module: 'PRODUCTS',
        action: 'CREATE',
      },
    });

    const productsReadPermission = await prismaService.permission.create({
      data: {
        name: 'PRODUCTS:READ',
        module: 'PRODUCTS',
        action: 'READ',
      },
    });

    const productsUpdatePermission = await prismaService.permission.create({
      data: {
        name: 'PRODUCTS:UPDATE',
        module: 'PRODUCTS',
        action: 'UPDATE',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: productsCreatePermission.id },
        { roleId: adminRole.id, permissionId: productsReadPermission.id },
        { roleId: adminRole.id, permissionId: productsUpdatePermission.id },
      ],
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-products',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Products',
        isActive: true,
        orgId: testOrgId,
      },
    });
    adminUserId = adminUser.id;

    // Assign ADMIN role to admin user
    await prismaService.userRole.create({
      data: {
        userId: adminUserId,
        roleId: adminRole.id,
        orgId: testOrgId,
      },
    });

    // Create test warehouse
    await prismaService.warehouse.create({
      data: {
        code: 'WH-TEST-001',
        name: 'Test Warehouse',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Create test product
    const product = await prismaService.product.create({
      data: {
        sku: 'TEST-PROD-001',
        name: 'Test Product',
        description: 'Test product description',
        unit: 'UNIT',
        price: 100.0,
        isActive: true,
        orgId: testOrgId,
      },
    });
    testProductId = product.id;

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Organization-ID', testOrgId)
      .send({
        email: adminEmail,
        password: adminPassword,
      });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.body.data.tokens.accessToken;
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
      await prismaService.warehouse.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.userRole.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.rolePermission.deleteMany({
        where: {
          role: {
            orgId: testOrgId,
          },
        },
      });
      await prismaService.permission.deleteMany({
        where: {
          rolePermissions: {
            some: {
              role: {
                orgId: testOrgId,
              },
            },
          },
        },
      });
      await prismaService.role.deleteMany({
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
