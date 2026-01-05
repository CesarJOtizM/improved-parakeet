import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Roles Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-roles-123';
  const adminEmail = 'admin-roles@test.com';
  const adminPassword = 'ValidPass123!';
  let adminToken: string;
  let testRoleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
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

  describe('POST /roles', () => {
    it('Given: admin user and valid role data When: creating role Then: should return created role', async () => {
      // Arrange
      const createRoleData = {
        name: 'TEST_ROLE',
        description: 'Test role description',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createRoleData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createRoleData.name);
      expect(response.body.data.description).toBe(createRoleData.description);
    });

    it('Given: no authentication token When: creating role Then: should return unauthorized error', async () => {
      // Arrange
      const createRoleData = {
        name: 'TEST_ROLE',
        description: 'Test role description',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/roles')
        .set('X-Organization-ID', testOrgId)
        .send(createRoleData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /roles', () => {
    it('Given: admin user When: getting roles Then: should return paginated roles list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /roles/:id', () => {
    it('Given: valid role ID When: getting role Then: should return role details', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testRoleId);
    });

    it('Given: invalid role ID When: getting role Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/roles/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /roles/:id', () => {
    it('Given: valid role ID and update data When: updating role Then: should return updated role', async () => {
      // Arrange
      const updateData = {
        name: 'UPDATED_ROLE',
        description: 'Updated description',
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });
  });

  describe('DELETE /roles/:id', () => {
    it('Given: valid role ID When: deleting role Then: should delete role successfully', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .delete(`/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /roles/:id/permissions', () => {
    it('Given: valid role ID and permissions When: assigning permissions Then: should assign permissions successfully', async () => {
      // Arrange
      const permission = await prismaService.permission.create({
        data: {
          name: 'TEST:PERMISSION',
          module: 'TEST',
          action: 'PERMISSION',
        },
      });

      const assignData = {
        permissionIds: [permission.id],
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(`/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(assignData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
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
        slug: 'test-org-roles',
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
    const rolesCreatePermission = await prismaService.permission.create({
      data: {
        name: 'ROLES:CREATE',
        module: 'ROLES',
        action: 'CREATE',
      },
    });

    const rolesReadPermission = await prismaService.permission.create({
      data: {
        name: 'ROLES:READ',
        module: 'ROLES',
        action: 'READ',
      },
    });

    const rolesUpdatePermission = await prismaService.permission.create({
      data: {
        name: 'ROLES:UPDATE',
        module: 'ROLES',
        action: 'UPDATE',
      },
    });

    const rolesDeletePermission = await prismaService.permission.create({
      data: {
        name: 'ROLES:DELETE',
        module: 'ROLES',
        action: 'DELETE',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: rolesCreatePermission.id },
        { roleId: adminRole.id, permissionId: rolesReadPermission.id },
        { roleId: adminRole.id, permissionId: rolesUpdatePermission.id },
        { roleId: adminRole.id, permissionId: rolesDeletePermission.id },
      ],
    });

    // Create admin user
    await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-roles',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Roles',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Get user and assign role
    const adminUser = await prismaService.user.findUnique({
      where: { email: adminEmail },
    });
    if (adminUser) {
      await prismaService.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
          orgId: testOrgId,
        },
      });
    }

    // Create test role
    const role = await prismaService.role.create({
      data: {
        name: 'TEST_ROLE',
        description: 'Test role',
        isActive: true,
        orgId: testOrgId,
      },
    });
    testRoleId = role.id;

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
      await prismaService.rolePermission.deleteMany({
        where: {
          role: {
            orgId: testOrgId,
          },
        },
      });
      await prismaService.permission.deleteMany();
      await prismaService.userRole.deleteMany({
        where: { orgId: testOrgId },
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
