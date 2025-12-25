import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Transfers Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-transfers-123';
  const adminEmail = 'admin-transfers@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testProductId: string;
  let testWarehouseFromId: string;
  let testWarehouseToId: string;

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

  describe('POST /inventory/transfers', () => {
    it('Given: admin user and valid transfer data When: initiating transfer Then: should return created transfer', async () => {
      // Arrange
      const initiateTransferData = {
        fromWarehouseId: testWarehouseFromId,
        toWarehouseId: testWarehouseToId,
        note: 'Test transfer',
        lines: [
          {
            productId: testProductId,
            quantity: 5,
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(initiateTransferData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.fromWarehouseId).toBe(testWarehouseFromId);
      expect(response.body.data.toWarehouseId).toBe(testWarehouseToId);
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: same warehouse for from and to When: initiating transfer Then: should return bad request error', async () => {
      // Arrange
      const initiateTransferData = {
        fromWarehouseId: testWarehouseFromId,
        toWarehouseId: testWarehouseFromId, // Same warehouse
        lines: [
          {
            productId: testProductId,
            quantity: 5,
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(initiateTransferData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: no authentication token When: initiating transfer Then: should return unauthorized error', async () => {
      // Arrange
      const initiateTransferData = {
        fromWarehouseId: testWarehouseFromId,
        toWarehouseId: testWarehouseToId,
        lines: [
          {
            productId: testProductId,
            quantity: 5,
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set('X-Organization-ID', testOrgId)
        .send(initiateTransferData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /inventory/transfers', () => {
    it('Given: admin user When: getting transfers Then: should return paginated transfers list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/transfers')
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

    it('Given: query parameters When: getting transfers Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/transfers?page=1&limit=5&status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
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
        slug: 'test-org-transfers',
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

    // Create INVENTORY permissions
    const inventoryTransferPermission = await prismaService.permission.create({
      data: {
        name: 'INVENTORY:TRANSFER',
        module: 'INVENTORY',
        action: 'TRANSFER',
      },
    });

    const inventoryReadPermission = await prismaService.permission.create({
      data: {
        name: 'INVENTORY:READ',
        module: 'INVENTORY',
        action: 'READ',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: inventoryTransferPermission.id },
        { roleId: adminRole.id, permissionId: inventoryReadPermission.id },
      ],
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-transfers',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Transfers',
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

    // Create test warehouses
    const warehouseFrom = await prismaService.warehouse.create({
      data: {
        code: 'WH-FROM-001',
        name: 'From Warehouse',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testWarehouseFromId = warehouseFrom.id;

    const warehouseTo = await prismaService.warehouse.create({
      data: {
        code: 'WH-TO-001',
        name: 'To Warehouse',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testWarehouseToId = warehouseTo.id;

    // Create test product
    const product = await prismaService.product.create({
      data: {
        sku: 'PROD-TRANS-001',
        name: 'Test Product',
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
      // Note: Transfer and TransferLine models may not exist in Prisma schema yet
      // Cleanup will be handled by cascade deletes or manual cleanup if needed
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
