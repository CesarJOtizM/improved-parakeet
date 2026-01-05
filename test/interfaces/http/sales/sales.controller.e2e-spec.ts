/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: This test needs to be updated to match the current schema
import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { SalesHttpModule } from '@interface/http/sales/salesHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Sales Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-sales-123';
  const adminEmail = 'admin-sales@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testWarehouseId: string;
  let testProductId: string;
  let testLocationId: string;
  let testSaleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule, InventoryHttpModule, SalesHttpModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

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

  describe('POST /sales', () => {
    it('Given: admin user and valid sale data When: creating sale Then: should return created sale', async () => {
      // Arrange
      const createSaleData = {
        warehouseId: testWarehouseId,
        customerName: 'Test Customer',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 5,
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createSaleData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouseId).toBe(testWarehouseId);
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.lines).toHaveLength(1);
    });

    it('Given: no authentication token When: creating sale Then: should return unauthorized error', async () => {
      // Arrange
      const createSaleData = {
        warehouseId: testWarehouseId,
        customerName: 'Test Customer',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 5,
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('X-Organization-ID', testOrgId)
        .send(createSaleData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /sales', () => {
    it('Given: admin user When: getting sales Then: should return paginated sales list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /sales/:id', () => {
    it('Given: valid sale ID When: getting sale Then: should return sale details', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/sales/${testSaleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testSaleId);
    });

    it('Given: invalid sale ID When: getting sale Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/sales/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /sales/:id/confirm', () => {
    it('Given: draft sale When: confirming sale Then: should confirm sale successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post(`/sales/${testSaleId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('POST /sales/:id/cancel', () => {
    it('Given: draft sale When: canceling sale Then: should cancel sale successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post(`/sales/${testSaleId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
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
        slug: 'test-org-sales',
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

    // Create permissions
    const salesCreatePermission = await prismaService.permission.create({
      data: {
        name: 'SALES:CREATE',
        module: 'SALES',
        action: 'CREATE',
      },
    });

    const salesReadPermission = await prismaService.permission.create({
      data: {
        name: 'SALES:READ',
        module: 'SALES',
        action: 'READ',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: salesCreatePermission.id },
        { roleId: adminRole.id, permissionId: salesReadPermission.id },
      ],
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-sales',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Sales',
        isActive: true,
        orgId: testOrgId,
      },
    });
    adminUserId = adminUser.id;

    // Assign role to user
    await prismaService.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        orgId: testOrgId,
      },
    });

    // Create warehouse
    const warehouse = await prismaService.warehouse.create({
      data: {
        name: 'Test Warehouse',
        code: 'WH-001',
        orgId: testOrgId,
        isActive: true,
      },
    });
    testWarehouseId = warehouse.id;

    // Create location
    const location = await prismaService.location.create({
      data: {
        name: 'Test Location',
        code: 'LOC-001',
        warehouseId: warehouse.id,
        orgId: testOrgId,
      },
    });
    testLocationId = location.id;

    // Create product
    const product = await prismaService.product.create({
      data: {
        sku: 'PROD-SALE-001',
        name: 'Test Product',
        unit: 'UNIT',
        orgId: testOrgId,
        isActive: true,
        costMethod: 'AVG',
      },
    });
    testProductId = product.id;

    // Create stock
    await prismaService.stock.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        locationId: location.id,
        quantity: 100,
        orgId: testOrgId,
      },
    });

    // Create test sale
    const sale = await prismaService.sale.create({
      data: {
        warehouseId: warehouse.id,
        customerName: 'Test Customer',
        status: 'DRAFT',
        orgId: testOrgId,
        createdBy: adminUserId,
      },
    });
    testSaleId = sale.id;

    // Create sale line
    await prismaService.saleLine.create({
      data: {
        saleId: sale.id,
        productId: product.id,
        locationId: location.id,
        quantity: 10,
        orgId: testOrgId,
      },
    });

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
      await prismaService.saleLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.sale.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.stock.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.product.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.location.deleteMany({
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
      await prismaService.permission.deleteMany();
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
