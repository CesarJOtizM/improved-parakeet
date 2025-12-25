import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Movements Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-movements-123';
  const adminEmail = 'admin-movements@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testProductId: string;
  let testWarehouseId: string;
  let testMovementId: string;

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

  describe('POST /inventory/movements', () => {
    it('Given: admin user and valid movement data When: creating movement Then: should return created movement', async () => {
      // Arrange
      const createMovementData = {
        type: 'IN',
        warehouseId: testWarehouseId,
        reference: 'REF-001',
        note: 'Initial stock entry',
        lines: [
          {
            productId: testProductId,
            locationId: 'location-123',
            quantity: 10,
            unitCost: 100.0,
            currency: 'COP',
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createMovementData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe(createMovementData.type);
      expect(response.body.data.warehouseId).toBe(testWarehouseId);
      expect(response.body.data.lines).toBeDefined();
      expect(response.body.data.lines.length).toBe(1);
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: no authentication token When: creating movement Then: should return unauthorized error', async () => {
      // Arrange
      const createMovementData = {
        type: 'IN',
        warehouseId: testWarehouseId,
        lines: [
          {
            productId: testProductId,
            locationId: 'location-123',
            quantity: 10,
            currency: 'COP',
          },
        ],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('X-Organization-ID', testOrgId)
        .send(createMovementData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /inventory/movements', () => {
    it('Given: admin user When: getting movements Then: should return paginated movements list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/movements')
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

    it('Given: query parameters When: getting movements Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/movements?page=1&limit=5&status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /inventory/movements/:id/post', () => {
    it('Given: valid movement ID When: posting movement Then: should return posted movement', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post(`/inventory/movements/${testMovementId}/post`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('POSTED');
    });

    it('Given: invalid movement ID When: posting movement Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/movements/invalid-id/post')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
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
        slug: 'test-org-movements',
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
    const inventoryEntryPermission = await prismaService.permission.create({
      data: {
        name: 'INVENTORY:ENTRY',
        module: 'INVENTORY',
        action: 'ENTRY',
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
        { roleId: adminRole.id, permissionId: inventoryEntryPermission.id },
        { roleId: adminRole.id, permissionId: inventoryReadPermission.id },
      ],
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-movements',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Movements',
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
        code: 'WH-MOV-001',
        name: 'Test Warehouse',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testWarehouseId = warehouse.id;

    // Create test product
    const product = await prismaService.product.create({
      data: {
        sku: 'PROD-MOV-001',
        name: 'Test Product',
        unit: 'UNIT',
        price: 100.0,
        isActive: true,
        orgId: testOrgId,
      },
    });
    testProductId = product.id;

    // Create test movement
    const movement = await prismaService.movement.create({
      data: {
        type: 'IN',
        status: 'DRAFT',
        warehouseId: testWarehouseId,
        createdBy: adminUserId,
        orgId: testOrgId,
      },
    });
    testMovementId = movement.id;

    // Create movement line
    await prismaService.movementLine.create({
      data: {
        movementId: testMovementId,
        productId: testProductId,
        quantity: 10,
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
      await prismaService.movementLine.deleteMany({
        where: { orgId: testOrgId },
      });
      await prismaService.movement.deleteMany({
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
