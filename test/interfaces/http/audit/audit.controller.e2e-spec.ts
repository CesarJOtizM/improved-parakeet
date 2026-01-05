import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Audit Controller E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-audit-123';
  const adminEmail = 'admin-audit@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let testAuditLogId: string;

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

  describe('GET /audit/logs', () => {
    it('Given: admin user When: getting audit logs Then: should return paginated audit logs list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('Given: query parameters When: getting audit logs Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/audit/logs?page=1&limit=10&entityType=User')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('Given: no authentication token When: getting audit logs Then: should return unauthorized error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/audit/logs')
        .set('X-Organization-ID', testOrgId)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /audit/logs/:id', () => {
    it('Given: valid audit log ID When: getting audit log Then: should return audit log details', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/audit/logs/${testAuditLogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAuditLogId);
    });

    it('Given: invalid audit log ID When: getting audit log Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/audit/logs/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /audit/users/:userId/activity', () => {
    it('Given: valid user ID When: getting user activity Then: should return user activity logs', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/audit/users/${adminUserId}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('Given: query parameters When: getting user activity Then: should return paginated results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/audit/users/${adminUserId}/activity?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /audit/entities/:entityType/:entityId/history', () => {
    it('Given: valid entity type and ID When: getting entity history Then: should return entity history', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/audit/entities/User/${adminUserId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('Given: query parameters When: getting entity history Then: should return paginated results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/audit/entities/User/${adminUserId}/history?page=1&limit=10`)
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
        slug: 'test-org-audit',
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
    const auditReadPermission = await prismaService.permission.create({
      data: {
        name: 'AUDIT:READ',
        module: 'AUDIT',
        action: 'READ',
      },
    });

    // Assign permissions to role
    await prismaService.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: auditReadPermission.id,
      },
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin-audit',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Audit',
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

    // Create test audit log
    const auditLog = await prismaService.auditLog.create({
      data: {
        entityType: 'User',
        entityId: adminUserId,
        action: 'CREATE',
        performedBy: adminUserId,
        orgId: testOrgId,
        metadata: { test: 'data' },
      },
    });
    testAuditLogId = auditLog.id;

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
      await prismaService.auditLog.deleteMany({
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
