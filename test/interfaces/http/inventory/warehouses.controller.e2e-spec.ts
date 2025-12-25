import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Warehouses Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-warehouses-123';
  const adminEmail = 'admin-warehouses@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;

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

  describe('POST /inventory/warehouses', () => {
    it('Given: admin user and valid warehouse data When: creating warehouse Then: should return created warehouse', async () => {
      // Arrange
      const createWarehouseData = {
        code: 'WH-NEW-001',
        name: 'New Warehouse',
        description: 'New warehouse description',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        },
        isActive: true,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createWarehouseData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe(createWarehouseData.code);
      expect(response.body.data.name).toBe(createWarehouseData.name);
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: duplicate warehouse code When: creating warehouse Then: should return conflict error', async () => {
      // Arrange
      const createWarehouseData = {
        code: 'WH-TEST-001', // Same code as in setup
        name: 'Another Warehouse',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createWarehouseData)
        .expect(409);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: no authentication token When: creating warehouse Then: should return unauthorized error', async () => {
      // Arrange
      const createWarehouseData = {
        code: 'WH-NEW-002',
        name: 'New Warehouse',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/inventory/warehouses')
        .set('X-Organization-ID', testOrgId)
        .send(createWarehouseData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /inventory/warehouses', () => {
    it('Given: admin user When: getting warehouses Then: should return paginated warehouses list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/warehouses')
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

    it('Given: query parameters When: getting warehouses Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/warehouses?page=1&limit=5&isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('Given: search parameter When: getting warehouses Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/inventory/warehouses?search=TEST')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
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
        slug: 'test-org-warehouses',
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

    // Create WAREHOUSES permissions
    const warehousesCreatePermission = await prismaService.permission.create({
      data: {
        name: 'WAREHOUSES:CREATE',
        module: 'WAREHOUSES',
        action: 'CREATE',
      },
    });

    const warehousesReadPermission = await prismaService.permission.create({
      data: {
        name: 'WAREHOUSES:READ',
        module: 'WAREHOUSES',
        action: 'READ',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: warehousesCreatePermission.id },
        { roleId: adminRole.id, permissionId: warehousesReadPermission.id },
      ],
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-warehouses',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Warehouses',
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
