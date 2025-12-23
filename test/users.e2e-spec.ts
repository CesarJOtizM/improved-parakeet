import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Users Management E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testOrgId = 'test-org-users-123';
  const adminEmail = 'admin@test.com';
  const adminPassword = 'ValidPass123!';
  let adminUserId: string;
  let adminToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
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

  describe('POST /users', () => {
    it('Given: admin user and valid user data When: creating user Then: should return created user', async () => {
      // Arrange
      const createUserData = {
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createUserData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(createUserData.email);
      expect(response.body.data.username).toBe(createUserData.username);
      expect(response.body.data.firstName).toBe(createUserData.firstName);
      expect(response.body.data.lastName).toBe(createUserData.lastName);
      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.orgId).toBe(testOrgId);
    });

    it('Given: duplicate email When: creating user Then: should return bad request error', async () => {
      // Arrange
      const createUserData = {
        email: adminEmail, // Duplicate email
        username: 'anotheruser',
        password: 'ValidPass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(createUserData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });

    it('Given: no authentication token When: creating user Then: should return unauthorized error', async () => {
      // Arrange
      const createUserData = {
        email: 'user@test.com',
        username: 'user',
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('X-Organization-ID', testOrgId)
        .send(createUserData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users', () => {
    it('Given: admin user When: getting users Then: should return paginated users list', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBeDefined();
      expect(response.body.data.pagination.limit).toBeDefined();
      expect(response.body.data.pagination.total).toBeDefined();
    });

    it('Given: query parameters When: getting users Then: should return filtered results', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=5&status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /users/:id', () => {
    it('Given: valid user ID When: getting user Then: should return user details', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);
      expect(response.body.data.email).toBeDefined();
      expect(response.body.data.username).toBeDefined();
    });

    it('Given: non-existent user ID When: getting user Then: should return not found error', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id', () => {
    it('Given: valid user data When: updating user Then: should return updated user', async () => {
      // Arrange
      const updateUserData = {
        firstName: 'Updated',
        lastName: 'Name',
        username: 'updateduser',
        email: 'updated@test.com',
      };

      // Act
      const response = await request(app.getHttpServer())
        .put(`/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(updateUserData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateUserData.firstName);
      expect(response.body.data.lastName).toBe(updateUserData.lastName);
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('Given: valid status change When: changing user status Then: should return updated user', async () => {
      // Arrange
      const changeStatusData = {
        status: 'INACTIVE',
        reason: 'User requested deactivation',
      };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/users/${regularUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(changeStatusData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('INACTIVE');
      expect(response.body.message).toContain('INACTIVE');
    });

    it('Given: invalid status When: changing user status Then: should return bad request error', async () => {
      // Arrange
      const changeStatusData = {
        status: 'INVALID_STATUS',
      };

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/users/${regularUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Organization-ID', testOrgId)
        .send(changeStatusData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /users/:id/roles', () => {
    it('Given: valid role assignment When: assigning role Then: should return success response', async () => {
      // Arrange
      const role = await prismaService.role.findFirst({
        where: { name: 'SUPERVISOR', orgId: testOrgId },
      });

      if (!role) {
        // Create role if it doesn't exist
        const newRole = await prismaService.role.create({
          data: {
            name: 'SUPERVISOR',
            description: 'Supervisor role',
            isActive: true,
            orgId: testOrgId,
          },
        });

        const assignRoleData = {
          roleId: newRole.id,
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/users/${regularUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .send(assignRoleData)
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data.roleName).toBe('SUPERVISOR');
      } else {
        const assignRoleData = {
          roleId: role.id,
        };

        // Act
        const response = await request(app.getHttpServer())
          .post(`/users/${regularUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .send(assignRoleData)
          .expect(201);

        // Assert
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('DELETE /users/:id/roles/:roleId', () => {
    it('Given: user with role When: removing role Then: should return success response', async () => {
      // Arrange - First assign a role
      const role = await prismaService.role.findFirst({
        where: { name: 'SUPERVISOR', orgId: testOrgId },
      });

      if (!role) {
        // Create role if it doesn't exist
        const newRole = await prismaService.role.create({
          data: {
            name: 'SUPERVISOR',
            description: 'Supervisor role',
            isActive: true,
            orgId: testOrgId,
          },
        });

        // Assign role first
        await request(app.getHttpServer())
          .post(`/users/${regularUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .send({ roleId: newRole.id })
          .expect(201);

        // Act - Remove role
        const response = await request(app.getHttpServer())
          .delete(`/users/${regularUserId}/roles/${newRole.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
      } else {
        // Assign role first
        await request(app.getHttpServer())
          .post(`/users/${regularUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .send({ roleId: role.id })
          .expect(201);

        // Act - Remove role
        const response = await request(app.getHttpServer())
          .delete(`/users/${regularUserId}/roles/${role.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Organization-ID', testOrgId)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
      }
    });
  });

  // Helper functions
  async function setupTestData() {
    const hashedPassword = await AuthenticationService.hashPassword(adminPassword);

    // Create ADMIN role
    const adminRole = await prismaService.role.create({
      data: {
        name: 'ADMIN',
        description: 'Admin role',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Create admin user
    const adminUser = await prismaService.user.create({
      data: {
        email: adminEmail,
        username: 'admin',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
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

    // Create regular user
    const regularUser = await prismaService.user.create({
      data: {
        email: 'regular@test.com',
        username: 'regular',
        passwordHash: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        orgId: testOrgId,
      },
    });
    regularUserId = regularUser.id;

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
    // If login fails, tests that require authentication will fail appropriately
  }

  async function cleanupTestData() {
    if (!prismaService) {
      return;
    }

    await prismaService.userRole.deleteMany({
      where: { orgId: testOrgId },
    });

    await prismaService.session.deleteMany({
      where: { orgId: testOrgId },
    });

    await prismaService.user.deleteMany({
      where: { orgId: testOrgId },
    });

    await prismaService.role.deleteMany({
      where: { orgId: testOrgId },
    });
  }
});
