import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { ReturnsHttpModule } from '@interface/http/returns/returnsHttp.module';
import { SalesHttpModule } from '@interface/http/sales/salesHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Returns Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-returns-123';
  const adminEmail = 'admin-returns@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testWarehouseId: string;
  let testProductId: string;
  let testLocationId: string;
  let testSaleId: string;
  let testMovementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule, InventoryHttpModule, SalesHttpModule, ReturnsHttpModule],
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

  describe('POST /returns', () => {
    it('Given: admin user and valid customer return data When: creating return Then: should return created return', async () => {
      // Arrange
      const createReturnData = {
        type: 'RETURN_CUSTOMER',
        warehouseId: testWarehouseId,
        saleId: testSaleId,
        reason: 'Defective product',
        note: 'Customer return test',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 2,
            originalSalePrice: 150.5,
            currency: 'COP',
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createReturnData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('RETURN_CUSTOMER');
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.saleId).toBe(testSaleId);
      expect(response.body.data.lines).toHaveLength(1);
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: admin user and valid supplier return data When: creating return Then: should return created return', async () => {
      // Arrange
      const createReturnData = {
        type: 'RETURN_SUPPLIER',
        warehouseId: testWarehouseId,
        sourceMovementId: testMovementId,
        reason: 'Defective product',
        note: 'Supplier return test',
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 1,
            originalUnitCost: 100.0,
            currency: 'COP',
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createReturnData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('RETURN_SUPPLIER');
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.sourceMovementId).toBe(testMovementId);
      expect(response.body.data.lines).toHaveLength(1);
    });

    it('Given: missing saleId for customer return When: creating return Then: should return validation error', async () => {
      // Arrange
      const createReturnData = {
        type: 'RETURN_CUSTOMER',
        warehouseId: testWarehouseId,
        // Missing saleId
        lines: [
          {
            productId: testProductId,
            locationId: testLocationId,
            quantity: 1,
            originalSalePrice: 150.5,
          },
        ],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createReturnData)
        .expect(400);
    });
  });

  describe('GET /returns', () => {
    it('Given: existing returns When: listing returns Then: should return paginated list', async () => {
      // Arrange - Create a return first
      await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      // Act
      const response = await request(app.getHttpServer())
        .get('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    it('Given: filter by type When: listing returns Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .query({ type: 'RETURN_CUSTOMER' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((returnItem: { type: string }) => {
          expect(returnItem.type).toBe('RETURN_CUSTOMER');
        });
      }
    });
  });

  describe('GET /returns/:id', () => {
    it('Given: existing return When: getting return by ID Then: should return return data', async () => {
      // Arrange - Create a return first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      const returnId = createResponse.body.data.id;

      // Act
      const response = await request(app.getHttpServer())
        .get(`/returns/${returnId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(returnId);
      expect(response.body.data.type).toBe('RETURN_CUSTOMER');
    });

    it('Given: non-existent return ID When: getting return Then: should return not found error', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/returns/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(400);
    });
  });

  describe('PUT /returns/:id', () => {
    it('Given: draft return When: updating return Then: should return updated return', async () => {
      // Arrange - Create a return first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      const returnId = createResponse.body.data.id;

      // Act
      const response = await request(app.getHttpServer())
        .put(`/returns/${returnId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          reason: 'Updated reason',
          note: 'Updated note',
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.note).toBe('Updated note');
    });
  });

  describe('POST /returns/:id/confirm', () => {
    it('Given: draft return with lines When: confirming return Then: should return confirmed return', async () => {
      // Arrange - Create a return first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      const returnId = createResponse.body.data.id;

      // Act
      const response = await request(app.getHttpServer())
        .post(`/returns/${returnId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CONFIRMED');
      expect(response.body.data.confirmedAt).toBeDefined();
    });
  });

  describe('POST /returns/:id/cancel', () => {
    it('Given: draft return When: cancelling return Then: should return cancelled return', async () => {
      // Arrange - Create a return first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      const returnId = createResponse.body.data.id;

      // Act
      const response = await request(app.getHttpServer())
        .post(`/returns/${returnId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .query({ reason: 'Cancellation reason' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
      expect(response.body.data.cancelledAt).toBeDefined();
    });
  });

  describe('POST /returns/:id/lines', () => {
    it('Given: draft return When: adding line Then: should return return with new line', async () => {
      // Arrange - Create a return first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [],
        });

      const returnId = createResponse.body.data.id;

      // Act
      const response = await request(app.getHttpServer())
        .post(`/returns/${returnId}/lines`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          productId: testProductId,
          locationId: testLocationId,
          quantity: 1,
          currency: 'COP',
        })
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(testProductId);
    });
  });

  describe('DELETE /returns/:id/lines/:lineId', () => {
    it('Given: draft return with line When: removing line Then: should return success', async () => {
      // Arrange - Create a return with a line first
      const createResponse = await request(app.getHttpServer())
        .post('/returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send({
          type: 'RETURN_CUSTOMER',
          warehouseId: testWarehouseId,
          saleId: testSaleId,
          lines: [
            {
              productId: testProductId,
              locationId: testLocationId,
              quantity: 1,
              originalSalePrice: 150.5,
            },
          ],
        });

      const returnId = createResponse.body.data.id;
      const lineId = createResponse.body.data.lines[0].id;

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/returns/${returnId}/lines/${lineId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });
  });

  async function setupTestData() {
    // Create test organization
    await prismaService.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization Returns',
        slug: 'test-org-returns',
        domain: 'test-returns.com',
        isActive: true,
      },
    });

    // Get or create ADMIN role
    let adminRole = await prismaService.role.findFirst({
      where: { name: 'ADMIN', isSystem: true },
    });

    if (!adminRole) {
      adminRole = await prismaService.role.create({
        data: {
          name: 'ADMIN',
          description: 'Administrator',
          isActive: true,
          isSystem: true,
          orgId: null,
        },
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-returns',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Returns',
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
    const warehouse = await prismaService.warehouse.create({
      data: {
        code: 'WH-RETURNS-001',
        name: 'Test Warehouse Returns',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testWarehouseId = warehouse.id;

    // Create test location (locationId is just a string, not a model)
    testLocationId = 'LOC-RETURNS-001';

    // Create test product
    const product = await prismaService.product.create({
      data: {
        sku: 'PROD-RETURNS-001',
        name: 'Test Product Returns',
        description: 'Test product for returns',
        unit: 'UNIT',
        price: 100.0,
        isActive: true,
        orgId: testOrgId,
      },
    });
    testProductId = product.id;

    // Create stock for the product
    await prismaService.stock.create({
      data: {
        productId: testProductId,
        warehouseId: testWarehouseId,
        quantity: 100,
        unitCost: 100.0,
        orgId: testOrgId,
      },
    });

    // Create a test sale for customer returns
    const sale = await prismaService.sale.create({
      data: {
        saleNumber: 'SALE-TEST-001',
        status: 'CONFIRMED',
        warehouseId: testWarehouseId,
        orgId: testOrgId,
        createdBy: adminUserId,
      },
    });
    testSaleId = sale.id;

    // Create sale line
    await prismaService.saleLine.create({
      data: {
        saleId: testSaleId,
        productId: testProductId,
        locationId: testLocationId,
        quantity: 10,
        salePrice: 150.5,
        currency: 'COP',
        orgId: testOrgId,
      },
    });

    // Create a test movement for supplier returns
    const movement = await prismaService.movement.create({
      data: {
        type: 'IN',
        status: 'POSTED',
        reason: 'PURCHASE',
        warehouseId: testWarehouseId,
        orgId: testOrgId,
        createdBy: adminUserId,
      },
    });
    testMovementId = movement.id;

    // Create movement line
    await prismaService.movementLine.create({
      data: {
        movementId: testMovementId,
        productId: testProductId,
        locationId: testLocationId,
        quantity: 20,
        unitCost: 100.0,
        currency: 'COP',
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
      await prismaService.returnLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.return.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.saleLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.sale.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.movementLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.movement.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.stock.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.product.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.warehouse.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.userRole.deleteMany({
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
