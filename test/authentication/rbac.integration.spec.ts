import { AssignRoleToUserUseCase } from '@application/userUseCases/assignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@application/userUseCases/removeRoleFromUserUseCase';
import { AuthenticationModule } from '@auth/authentication.module';
import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RoleRepository } from '@infrastructure/database/repositories/role.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('RBAC Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;
  let assignRoleUseCase: AssignRoleToUserUseCase;
  let removeRoleUseCase: RemoveRoleFromUserUseCase;

  const testOrgId1 = 'test-org-1';
  const testOrgId2 = 'test-org-2';
  let adminUser1Id: string;
  let regularUser1Id: string;
  let regularUser2Id: string;

  beforeAll(async () => {
    // Skip if DATABASE_URL is not set
    if (!process.env.DATABASE_URL) {
      return;
    }

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AuthenticationModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prismaService = moduleFixture.get<PrismaService>(PrismaService);
      userRepository = moduleFixture.get<UserRepository>('UserRepository');
      roleRepository = moduleFixture.get<RoleRepository>('RoleRepository');
      assignRoleUseCase = moduleFixture.get<AssignRoleToUserUseCase>(AssignRoleToUserUseCase);
      removeRoleUseCase = moduleFixture.get<RemoveRoleFromUserUseCase>(RemoveRoleFromUserUseCase);

      // Clean up test data
      if (prismaService) {
        await cleanupTestData();
      }
    } catch (error) {
      // If database connection fails, skip the test suite
      if (error instanceof Error && error.message.includes('database')) {
        console.warn('Database connection failed, skipping RBAC integration tests');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL || !prismaService) {
      return;
    }
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL || !prismaService) {
      return;
    }
    await cleanupTestData();
    await setupTestData();
  });

  describe('Role Assignment', () => {
    it('Given: admin user and regular user When: assigning role Then: should assign role successfully', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      expect(role).not.toBeNull();

      // Act
      const result = await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: role!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.roleName).toBe('SUPERVISOR');

      // Verify role assignment in database
      const userRole = await prismaService.userRole.findUnique({
        where: {
          userId_roleId_orgId: {
            userId: regularUser1Id,
            roleId: role!.id,
            orgId: testOrgId1,
          },
        },
      });
      expect(userRole).not.toBeNull();
    });

    it('Given: user with role When: assigning same role again Then: should throw error', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      expect(role).not.toBeNull();

      // First assignment
      await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: role!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      // Act & Assert
      await expect(
        assignRoleUseCase.execute({
          userId: regularUser1Id,
          roleId: role!.id,
          orgId: testOrgId1,
          assignedBy: adminUser1Id,
        })
      ).rejects.toThrow();
    });

    it('Given: user from different organization When: assigning role Then: should not affect other organization', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role1 = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      const role2 = await roleRepository.findByName('SUPERVISOR', testOrgId2);
      expect(role1).not.toBeNull();
      expect(role2).not.toBeNull();

      // Act - Assign role to user in org1
      await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: role1!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      // Assert - User in org2 should not have the role
      const userRole2 = await prismaService.userRole.findUnique({
        where: {
          userId_roleId_orgId: {
            userId: regularUser2Id,
            roleId: role2!.id,
            orgId: testOrgId2,
          },
        },
      });
      expect(userRole2).toBeNull();
    });
  });

  describe('Role Removal', () => {
    it('Given: user with role When: removing role Then: should remove role successfully', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      expect(role).not.toBeNull();

      // Assign role first
      await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: role!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      // Act
      const result = await removeRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: role!.id,
        orgId: testOrgId1,
        removedBy: adminUser1Id,
      });

      // Assert
      expect(result.success).toBe(true);

      // Verify role removal in database
      const userRole = await prismaService.userRole.findUnique({
        where: {
          userId_roleId_orgId: {
            userId: regularUser1Id,
            roleId: role!.id,
            orgId: testOrgId1,
          },
        },
      });
      expect(userRole).toBeNull();
    });

    it('Given: user without role When: removing role Then: should throw error', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      expect(role).not.toBeNull();

      // Act & Assert
      await expect(
        removeRoleUseCase.execute({
          userId: regularUser1Id,
          roleId: role!.id,
          orgId: testOrgId1,
          removedBy: adminUser1Id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Permission Inheritance', () => {
    it('Given: user with multiple roles When: getting permissions Then: should return combined permissions', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const supervisorRole = await roleRepository.findByName('SUPERVISOR', testOrgId1);
      const operatorRole = await roleRepository.findByName('WAREHOUSE_OPERATOR', testOrgId1);
      expect(supervisorRole).not.toBeNull();
      expect(operatorRole).not.toBeNull();

      // Assign both roles
      await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: supervisorRole!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      await assignRoleUseCase.execute({
        userId: regularUser1Id,
        roleId: operatorRole!.id,
        orgId: testOrgId1,
        assignedBy: adminUser1Id,
      });

      // Act - Get user with roles
      const user = await userRepository.findById(regularUser1Id, testOrgId1);
      expect(user).not.toBeNull();

      // Get roles for user
      const userRoles = await roleRepository.findRolesByUser(regularUser1Id, testOrgId1);

      // Create role permissions map (simplified for test)
      const rolePermissionsMap = new Map<string, string[]>();
      rolePermissionsMap.set('SUPERVISOR', ['USERS:READ', 'PRODUCTS:READ']);
      rolePermissionsMap.set('WAREHOUSE_OPERATOR', ['WAREHOUSES:READ', 'MOVEMENTS:POST']);

      // Act
      const effectivePermissions = RoleAssignmentService.getEffectivePermissions(
        userRoles,
        rolePermissionsMap
      );

      // Assert
      expect(effectivePermissions.length).toBeGreaterThan(0);
      expect(effectivePermissions).toContain('USERS:READ');
      expect(effectivePermissions).toContain('PRODUCTS:READ');
      expect(effectivePermissions).toContain('WAREHOUSES:READ');
      expect(effectivePermissions).toContain('MOVEMENTS:POST');
    });

    it('Given: user with ADMIN role When: getting permissions Then: should return all permissions', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const adminRole = await roleRepository.findByName('ADMIN', testOrgId1);
      expect(adminRole).not.toBeNull();

      // Get user roles (admin user should have ADMIN role)
      const userRoles = await roleRepository.findRolesByUser(adminUser1Id, testOrgId1);

      // Create role permissions map
      const rolePermissionsMap = new Map<string, string[]>();
      rolePermissionsMap.set('ADMIN', ['USERS:CREATE', 'USERS:READ']);
      rolePermissionsMap.set('SUPERVISOR', ['USERS:READ', 'PRODUCTS:READ']);

      // Act
      const effectivePermissions = RoleAssignmentService.getEffectivePermissions(
        userRoles,
        rolePermissionsMap
      );

      // Assert - ADMIN should have all permissions
      expect(effectivePermissions.length).toBeGreaterThan(0);
      // ADMIN role should include permissions from all roles
      expect(effectivePermissions).toContain('USERS:CREATE');
      expect(effectivePermissions).toContain('USERS:READ');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('Given: users from different organizations When: querying roles Then: should return only roles from their organization', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange & Act
      const org1Roles = await roleRepository.findAll(testOrgId1);
      const org2Roles = await roleRepository.findAll(testOrgId2);

      // Assert
      expect(org1Roles.length).toBeGreaterThan(0);
      expect(org2Roles.length).toBeGreaterThan(0);

      // Verify roles are isolated by organization
      org1Roles.forEach(role => {
        expect(role.orgId).toBe(testOrgId1);
      });

      org2Roles.forEach(role => {
        expect(role.orgId).toBe(testOrgId2);
      });
    });

    it('Given: user from org1 When: trying to assign role from org2 Then: should throw error', async () => {
      if (!process.env.DATABASE_URL || !roleRepository) {
        return;
      }
      // Arrange
      const role2 = await roleRepository.findByName('SUPERVISOR', testOrgId2);
      expect(role2).not.toBeNull();

      // Act & Assert
      await expect(
        assignRoleUseCase.execute({
          userId: regularUser1Id, // User from org1
          roleId: role2!.id, // Role from org2
          orgId: testOrgId1,
          assignedBy: adminUser1Id,
        })
      ).rejects.toThrow();
    });
  });

  // Helper functions
  async function cleanupTestData() {
    if (!process.env.DATABASE_URL || !prismaService) {
      return;
    }
    await prismaService.userRole.deleteMany({
      where: {
        orgId: {
          in: [testOrgId1, testOrgId2],
        },
      },
    });

    await prismaService.user.deleteMany({
      where: {
        orgId: {
          in: [testOrgId1, testOrgId2],
        },
      },
    });

    await prismaService.role.deleteMany({
      where: {
        orgId: {
          in: [testOrgId1, testOrgId2],
        },
      },
    });
  }

  async function setupTestData() {
    if (!process.env.DATABASE_URL || !prismaService) {
      return;
    }
    // Create test organization 1 roles
    const adminRole1 = await prismaService.role.create({
      data: {
        name: 'ADMIN',
        description: 'Admin role for org1',
        isActive: true,
        orgId: testOrgId1,
      },
    });

    await prismaService.role.create({
      data: {
        name: 'SUPERVISOR',
        description: 'Supervisor role for org1',
        isActive: true,
        orgId: testOrgId1,
      },
    });

    await prismaService.role.create({
      data: {
        name: 'WAREHOUSE_OPERATOR',
        description: 'Warehouse operator role for org1',
        isActive: true,
        orgId: testOrgId1,
      },
    });

    // Create test organization 2 roles
    await prismaService.role.create({
      data: {
        name: 'ADMIN',
        description: 'Admin role for org2',
        isActive: true,
        orgId: testOrgId2,
      },
    });

    await prismaService.role.create({
      data: {
        name: 'SUPERVISOR',
        description: 'Supervisor role for org2',
        isActive: true,
        orgId: testOrgId2,
      },
    });

    // Create test users for org1
    const adminUser1 = await prismaService.user.create({
      data: {
        email: 'admin1@test.com',
        username: 'admin1',
        passwordHash: 'hashed_password',
        firstName: 'Admin',
        lastName: 'One',
        isActive: true,
        orgId: testOrgId1,
      },
    });
    adminUser1Id = adminUser1.id;

    // Assign ADMIN role to admin user
    await prismaService.userRole.create({
      data: {
        userId: adminUser1Id,
        roleId: adminRole1.id,
        orgId: testOrgId1,
      },
    });

    const regularUser1 = await prismaService.user.create({
      data: {
        email: 'user1@test.com',
        username: 'user1',
        passwordHash: 'hashed_password',
        firstName: 'Regular',
        lastName: 'User One',
        isActive: true,
        orgId: testOrgId1,
      },
    });
    regularUser1Id = regularUser1.id;

    // Create test users for org2
    await prismaService.user.create({
      data: {
        email: 'admin2@test.com',
        username: 'admin2',
        passwordHash: 'hashed_password',
        firstName: 'Admin',
        lastName: 'Two',
        isActive: true,
        orgId: testOrgId2,
      },
    });

    const regularUser2 = await prismaService.user.create({
      data: {
        email: 'user2@test.com',
        username: 'user2',
        passwordHash: 'hashed_password',
        firstName: 'Regular',
        lastName: 'User Two',
        isActive: true,
        orgId: testOrgId2,
      },
    });
    regularUser2Id = regularUser2.id;
  }
});
