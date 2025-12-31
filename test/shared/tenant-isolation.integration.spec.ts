import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMovementRepository } from '@infrastructure/database/repositories/movement.repository';
import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { RoleRepository } from '@infrastructure/database/repositories/role.repository';
import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { UserRepository } from '@infrastructure/database/repositories/user.repository';
import { PrismaWarehouseRepository } from '@infrastructure/database/repositories/warehouse.repository';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Tenant Isolation Integration Tests
 *
 * These tests verify that data from one organization cannot be accessed by another organization.
 * This is critical for multi-tenant security.
 *
 * Test Strategy:
 * 1. Create test data for two organizations (org1 and org2)
 * 2. Attempt to access org2 data using org1 context
 * 3. Verify that queries return empty/null results or throw errors
 */
describeIf(!!process.env.DATABASE_URL)('Tenant Isolation Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let productRepository: PrismaProductRepository;
  let movementRepository: PrismaMovementRepository;
  let saleRepository: PrismaSaleRepository;
  let warehouseRepository: PrismaWarehouseRepository;
  let userRepository: UserRepository;
  let roleRepository: RoleRepository;

  const testOrgId1 = 'test-org-1-isolation';
  const testOrgId2 = 'test-org-2-isolation';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        PrismaService,
        PrismaProductRepository,
        PrismaMovementRepository,
        PrismaSaleRepository,
        PrismaWarehouseRepository,
        UserRepository,
        RoleRepository,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    productRepository = module.get<PrismaProductRepository>(PrismaProductRepository);
    movementRepository = module.get<PrismaMovementRepository>(PrismaMovementRepository);
    saleRepository = module.get<PrismaSaleRepository>(PrismaSaleRepository);
    warehouseRepository = module.get<PrismaWarehouseRepository>(PrismaWarehouseRepository);
    userRepository = module.get<UserRepository>(UserRepository);
    roleRepository = module.get<RoleRepository>(RoleRepository);

    // Create test organizations
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (module) {
      await module.close();
    }
  });

  describe('Product Repository Isolation', () => {
    let productId1: string;
    let productId2: string;

    beforeAll(async () => {
      // Create products in both organizations
      const product1 = await prisma.product.create({
        data: {
          sku: 'PROD-ORG1-001',
          name: 'Product Org 1',
          unit: 'UNIT',
          orgId: testOrgId1,
          isActive: true,
          costMethod: 'AVG',
        },
      });
      productId1 = product1.id;

      const product2 = await prisma.product.create({
        data: {
          sku: 'PROD-ORG2-001',
          name: 'Product Org 2',
          unit: 'UNIT',
          orgId: testOrgId2,
          isActive: true,
          costMethod: 'AVG',
        },
      });
      productId2 = product2.id;
    });

    it('Given: product in org1 When: querying from org1 Then: should find product', async () => {
      const product = await productRepository.findById(productId1, testOrgId1);
      expect(product).not.toBeNull();
      expect(product?.id).toBe(productId1);
    });

    it('Given: product in org2 When: querying from org1 Then: should return null', async () => {
      const product = await productRepository.findById(productId2, testOrgId1);
      expect(product).toBeNull();
    });

    it('Given: products in both orgs When: querying all from org1 Then: should only return org1 products', async () => {
      const products = await productRepository.findAll(testOrgId1);
      const productIds = products.map(p => p.id);
      expect(productIds).toContain(productId1);
      expect(productIds).not.toContain(productId2);
    });

    it('Given: SKU in org2 When: querying by SKU from org1 Then: should return null', async () => {
      const product = await productRepository.findBySku('PROD-ORG2-001', testOrgId1);
      expect(product).toBeNull();
    });

    it('Given: SKU in org1 When: checking existence from org2 Then: should return false', async () => {
      const exists = await productRepository.existsBySku('PROD-ORG1-001', testOrgId2);
      expect(exists).toBe(false);
    });
  });

  describe('Warehouse Repository Isolation', () => {
    let warehouseId1: string;
    let warehouseId2: string;

    beforeAll(async () => {
      const warehouse1 = await prisma.warehouse.create({
        data: {
          code: 'WH1',
          name: 'Warehouse Org 1',
          orgId: testOrgId1,
        },
      });
      warehouseId1 = warehouse1.id;

      const warehouse2 = await prisma.warehouse.create({
        data: {
          code: 'WH2',
          name: 'Warehouse Org 2',
          orgId: testOrgId2,
        },
      });
      warehouseId2 = warehouse2.id;
    });

    it('Given: warehouse in org1 When: querying from org1 Then: should find warehouse', async () => {
      const warehouse = await warehouseRepository.findById(warehouseId1, testOrgId1);
      expect(warehouse).not.toBeNull();
      expect(warehouse?.id).toBe(warehouseId1);
    });

    it('Given: warehouse in org2 When: querying from org1 Then: should return null', async () => {
      const warehouse = await warehouseRepository.findById(warehouseId2, testOrgId1);
      expect(warehouse).toBeNull();
    });

    it('Given: warehouses in both orgs When: querying all from org1 Then: should only return org1 warehouses', async () => {
      const warehouses = await warehouseRepository.findAll(testOrgId1);
      const warehouseIds = warehouses.map(w => w.id);
      expect(warehouseIds).toContain(warehouseId1);
      expect(warehouseIds).not.toContain(warehouseId2);
    });
  });

  describe('User Repository Isolation', () => {
    let userId1: string;
    let userId2: string;

    beforeAll(async () => {
      // Create users in both organizations
      const user1 = await prisma.user.create({
        data: {
          email: `user1-${Date.now()}@org1.test`,
          username: `user1-org1-${Date.now()}`,
          firstName: 'User',
          lastName: 'One',
          passwordHash: 'hashed-password',
          orgId: testOrgId1,
          isActive: true,
        },
      });
      userId1 = user1.id;

      const user2 = await prisma.user.create({
        data: {
          email: `user2-${Date.now()}@org2.test`,
          username: `user2-org2-${Date.now()}`,
          firstName: 'User',
          lastName: 'Two',
          passwordHash: 'hashed-password',
          orgId: testOrgId2,
          isActive: true,
        },
      });
      userId2 = user2.id;
    });

    it('Given: user in org1 When: querying from org1 Then: should find user', async () => {
      const user = await userRepository.findById(userId1, testOrgId1);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(userId1);
    });

    it('Given: user in org2 When: querying from org1 Then: should return null', async () => {
      const user = await userRepository.findById(userId2, testOrgId1);
      expect(user).toBeNull();
    });

    it('Given: users in both orgs When: querying all from org1 Then: should only return org1 users', async () => {
      const users = await userRepository.findAll(testOrgId1);
      const userIds = users.map(u => u.id);
      expect(userIds).toContain(userId1);
      expect(userIds).not.toContain(userId2);
    });
  });

  describe('Role Repository Isolation', () => {
    let roleId1: string;
    let roleId2: string;

    beforeAll(async () => {
      // Create custom roles in both organizations
      const role1 = await prisma.role.create({
        data: {
          name: `ROLE_ORG1_${Date.now()}`,
          description: 'Role for Org 1',
          isActive: true,
          isSystem: false,
          orgId: testOrgId1,
        },
      });
      roleId1 = role1.id;

      const role2 = await prisma.role.create({
        data: {
          name: `ROLE_ORG2_${Date.now()}`,
          description: 'Role for Org 2',
          isActive: true,
          isSystem: false,
          orgId: testOrgId2,
        },
      });
      roleId2 = role2.id;
    });

    it('Given: role in org1 When: querying from org1 Then: should find role', async () => {
      const role = await roleRepository.findById(roleId1, testOrgId1);
      expect(role).not.toBeNull();
      expect(role?.id).toBe(roleId1);
    });

    it('Given: role in org2 When: querying from org1 Then: should return null', async () => {
      const role = await roleRepository.findById(roleId2, testOrgId1);
      expect(role).toBeNull();
    });

    it('Given: roles in both orgs When: querying all from org1 Then: should only return org1 roles and system roles', async () => {
      const roles = await roleRepository.findAll(testOrgId1);
      const roleIds = roles.map(r => r.id);
      // Should contain org1 role
      expect(roleIds).toContain(roleId1);
      // Should NOT contain org2 role
      expect(roleIds).not.toContain(roleId2);
    });
  });

  describe('Movement Repository Isolation', () => {
    let movementId1: string;
    let movementId2: string;
    let warehouseId1: string;
    let warehouseId2: string;

    beforeAll(async () => {
      // Create warehouses first
      const wh1 = await prisma.warehouse.create({
        data: {
          code: 'WH-MOV1',
          name: 'Warehouse for Movements Org 1',
          orgId: testOrgId1,
        },
      });
      warehouseId1 = wh1.id;

      const wh2 = await prisma.warehouse.create({
        data: {
          code: 'WH-MOV2',
          name: 'Warehouse for Movements Org 2',
          orgId: testOrgId2,
        },
      });
      warehouseId2 = wh2.id;

      // Create movements
      const movement1 = await prisma.movement.create({
        data: {
          type: 'IN',
          status: 'DRAFT',
          warehouseId: warehouseId1,
          orgId: testOrgId1,
          reference: 'MOV-ORG1-001',
          createdBy: 'test-user-1',
        },
      });
      movementId1 = movement1.id;

      const movement2 = await prisma.movement.create({
        data: {
          type: 'IN',
          status: 'DRAFT',
          warehouseId: warehouseId2,
          orgId: testOrgId2,
          reference: 'MOV-ORG2-001',
          createdBy: 'test-user-2',
        },
      });
      movementId2 = movement2.id;
    });

    it('Given: movement in org1 When: querying from org1 Then: should find movement', async () => {
      const movement = await movementRepository.findById(movementId1, testOrgId1);
      expect(movement).not.toBeNull();
      expect(movement?.id).toBe(movementId1);
    });

    it('Given: movement in org2 When: querying from org1 Then: should return null', async () => {
      const movement = await movementRepository.findById(movementId2, testOrgId1);
      expect(movement).toBeNull();
    });

    it('Given: movements in both orgs When: querying all from org1 Then: should only return org1 movements', async () => {
      const movements = await movementRepository.findAll(testOrgId1);
      const movementIds = movements.map(m => m.id);
      expect(movementIds).toContain(movementId1);
      expect(movementIds).not.toContain(movementId2);
    });
  });

  describe('Sale Repository Isolation', () => {
    let saleId1: string;
    let saleId2: string;
    let warehouseId1: string;
    let warehouseId2: string;

    beforeAll(async () => {
      // Create warehouses first
      const wh1 = await prisma.warehouse.create({
        data: {
          code: 'WH-SALE1',
          name: 'Warehouse for Sales Org 1',
          orgId: testOrgId1,
        },
      });
      warehouseId1 = wh1.id;

      const wh2 = await prisma.warehouse.create({
        data: {
          code: 'WH-SALE2',
          name: 'Warehouse for Sales Org 2',
          orgId: testOrgId2,
        },
      });
      warehouseId2 = wh2.id;

      // Create sales
      const sale1 = await prisma.sale.create({
        data: {
          saleNumber: 'SALE-ORG1-001',
          status: 'DRAFT',
          warehouseId: warehouseId1,
          orgId: testOrgId1,
          createdBy: 'test-user-1',
        },
      });
      saleId1 = sale1.id;

      const sale2 = await prisma.sale.create({
        data: {
          saleNumber: 'SALE-ORG2-001',
          status: 'DRAFT',
          warehouseId: warehouseId2,
          orgId: testOrgId2,
          createdBy: 'test-user-2',
        },
      });
      saleId2 = sale2.id;
    });

    it('Given: sale in org1 When: querying from org1 Then: should find sale', async () => {
      const sale = await saleRepository.findById(saleId1, testOrgId1);
      expect(sale).not.toBeNull();
      expect(sale?.id).toBe(saleId1);
    });

    it('Given: sale in org2 When: querying from org1 Then: should return null', async () => {
      const sale = await saleRepository.findById(saleId2, testOrgId1);
      expect(sale).toBeNull();
    });

    it('Given: sales in both orgs When: querying all from org1 Then: should only return org1 sales', async () => {
      const sales = await saleRepository.findAll(testOrgId1);
      const saleIds = sales.map(s => s.id);
      expect(saleIds).toContain(saleId1);
      expect(saleIds).not.toContain(saleId2);
    });
  });

  // Helper functions
  async function setupTestData() {
    if (!process.env.DATABASE_URL || !prisma) {
      return;
    }

    // Create test organizations
    await prisma.organization.upsert({
      where: { id: testOrgId1 },
      update: {},
      create: {
        id: testOrgId1,
        name: 'Test Organization 1',
        slug: `test-org-1-${Date.now()}`,
        isActive: true,
      },
    });

    await prisma.organization.upsert({
      where: { id: testOrgId2 },
      update: {},
      create: {
        id: testOrgId2,
        name: 'Test Organization 2',
        slug: `test-org-2-${Date.now()}`,
        isActive: true,
      },
    });
  }

  async function cleanupTestData() {
    if (!process.env.DATABASE_URL || !prisma) {
      return;
    }

    // Delete in reverse order of dependencies
    await prisma.saleLine.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.sale.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.movementLine.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.movement.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.stock.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.product.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.warehouse.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.userRole.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.user.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.rolePermission.deleteMany({
      where: {
        role: { orgId: { in: [testOrgId1, testOrgId2] } },
      },
    });
    await prisma.role.deleteMany({ where: { orgId: { in: [testOrgId1, testOrgId2] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [testOrgId1, testOrgId2] } } });
  }
});

// Helper to conditionally run tests only if DATABASE_URL is set
function describeIf(condition: boolean) {
  return condition ? describe : describe.skip;
}
