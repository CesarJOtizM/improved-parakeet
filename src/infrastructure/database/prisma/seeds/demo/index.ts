/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';

import { DemoAuditLogsSeed } from './audit-logs.seed';
import { DemoCategoriesSeed } from './categories.seed';
import { DemoCompaniesSeed } from './companies.seed';
import { DemoMovementsSeed } from './movements.seed';
import { DemoOrganizationSeed } from './organization.seed';
import { DemoProductsSeed } from './products.seed';
import { DemoReturnsSeed } from './returns.seed';
import { DemoSalesSeed } from './sales.seed';
import { DemoStockSeed } from './stock.seed';
import { DemoTransfersSeed } from './transfers.seed';
import { DemoUsersSeed, FULL_USERS, SIMPLE_USERS } from './users.seed';
import { DemoWarehousesSeed } from './warehouses.seed';

export class DemoSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<void> {
    await this.seedFullOrg();
    await this.seedSimpleOrg();
  }

  /**
   * Empresa completa: picking habilitado + multi-company + 3 empresas hijas
   */
  private async seedFullOrg(): Promise<void> {
    console.log('\n🏢 [1/2] Sembrando empresa COMPLETA (picking + multi-company)...\n');

    // 1. Organization
    const orgSeed = new DemoOrganizationSeed(this.prisma);
    const org = await orgSeed.seedFullOrg();
    const orgId = org.id;
    console.log('  ✅ Organizacion:', org.name, `(${orgId.slice(0, 8)}...)`);

    // 2. Users
    const usersSeed = new DemoUsersSeed(this.prisma);
    const users = await usersSeed.seed(orgId, FULL_USERS);
    console.log('  ✅ Usuarios:', users.length);

    // 3. Categories
    const categoriesSeed = new DemoCategoriesSeed(this.prisma);
    const categories = await categoriesSeed.seed(orgId);
    console.log('  ✅ Categorias:', categories.length);

    // 4. Warehouses
    const warehousesSeed = new DemoWarehousesSeed(this.prisma);
    const warehouses = await warehousesSeed.seed(orgId);
    console.log('  ✅ Bodegas:', warehouses.length);

    // 5. Products
    const productsSeed = new DemoProductsSeed(this.prisma);
    const products = await productsSeed.seed(orgId, categories);
    console.log('  ✅ Productos:', products.length);

    // 6. Companies (multi-company)
    const companiesSeed = new DemoCompaniesSeed(this.prisma);
    const assigned = await companiesSeed.seed(orgId, products);
    console.log('  ✅ Empresas: 3 (productos asignados:', assigned, ')');

    // Get admin user for createdBy
    const adminUser = users[0]!;

    // 7. Movements
    const movementsSeed = new DemoMovementsSeed(this.prisma);
    const movResult = await movementsSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('  ✅ Movimientos creados (compras + ajustes)');

    // Compute available stock
    const available = this.computeAvailable(movResult);

    // 8. Sales
    const salesSeed = new DemoSalesSeed(this.prisma);
    const sales = await salesSeed.seed(orgId, products, warehouses, users, available);
    console.log('  ✅ Ventas:', sales.length);

    // 9. Returns
    const returnsSeed = new DemoReturnsSeed(this.prisma);
    const returns = await returnsSeed.seed(orgId, products, warehouses, sales, adminUser.id);
    console.log('  ✅ Devoluciones:', returns.length);

    // 10. Transfers
    const transfersSeed = new DemoTransfersSeed(this.prisma);
    const transfers = await transfersSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('  ✅ Transferencias:', transfers.length);

    // 11. Stock
    const stockSeed = new DemoStockSeed(this.prisma);
    await stockSeed.seed(orgId, products, available);
    console.log('  ✅ Stock calculado');

    // 12. Audit Logs
    const auditSeed = new DemoAuditLogsSeed(this.prisma);
    await auditSeed.seed(orgId, users);
    console.log('  ✅ Logs de auditoria');

    console.log('\n  🎉 Empresa completa lista!\n');
  }

  /**
   * Empresa simple: sin picking, sin multi-company, menos usuarios
   */
  private async seedSimpleOrg(): Promise<void> {
    console.log('🏪 [2/2] Sembrando empresa SIMPLE (sin picking, sin multi-company)...\n');

    // 1. Organization
    const orgSeed = new DemoOrganizationSeed(this.prisma);
    const org = await orgSeed.seedSimpleOrg();
    const orgId = org.id;
    console.log('  ✅ Organizacion:', org.name, `(${orgId.slice(0, 8)}...)`);

    // 2. Users (4 instead of 7)
    const usersSeed = new DemoUsersSeed(this.prisma);
    const users = await usersSeed.seed(orgId, SIMPLE_USERS);
    console.log('  ✅ Usuarios:', users.length);

    // 3. Categories
    const categoriesSeed = new DemoCategoriesSeed(this.prisma);
    const categories = await categoriesSeed.seed(orgId);
    console.log('  ✅ Categorias:', categories.length);

    // 4. Warehouses
    const warehousesSeed = new DemoWarehousesSeed(this.prisma);
    const warehouses = await warehousesSeed.seed(orgId);
    console.log('  ✅ Bodegas:', warehouses.length);

    // 5. Products (no company assignment)
    const productsSeed = new DemoProductsSeed(this.prisma);
    const products = await productsSeed.seed(orgId, categories);
    console.log('  ✅ Productos:', products.length);

    // Get admin user for createdBy
    const adminUser = users[0]!;

    // 6. Movements
    const movementsSeed = new DemoMovementsSeed(this.prisma);
    const movResult = await movementsSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('  ✅ Movimientos creados (compras + ajustes)');

    // Compute available stock
    const available = this.computeAvailable(movResult);

    // 7. Sales
    const salesSeed = new DemoSalesSeed(this.prisma);
    const sales = await salesSeed.seed(orgId, products, warehouses, users, available);
    console.log('  ✅ Ventas:', sales.length);

    // 8. Returns
    const returnsSeed = new DemoReturnsSeed(this.prisma);
    const returns = await returnsSeed.seed(orgId, products, warehouses, sales, adminUser.id);
    console.log('  ✅ Devoluciones:', returns.length);

    // 9. Transfers
    const transfersSeed = new DemoTransfersSeed(this.prisma);
    const transfers = await transfersSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('  ✅ Transferencias:', transfers.length);

    // 10. Stock
    const stockSeed = new DemoStockSeed(this.prisma);
    await stockSeed.seed(orgId, products, available);
    console.log('  ✅ Stock calculado');

    // 11. Audit Logs
    const auditSeed = new DemoAuditLogsSeed(this.prisma);
    await auditSeed.seed(orgId, users);
    console.log('  ✅ Logs de auditoria');

    console.log('\n  🎉 Empresa simple lista!\n');
  }

  private computeAvailable(movResult: {
    purchasedQty: Map<string, number>;
    adjustInQty: Map<string, number>;
    adjustOutQty: Map<string, number>;
  }): Map<string, number> {
    const available = new Map<string, number>();
    movResult.purchasedQty.forEach((qty, key) => {
      available.set(key, (available.get(key) || 0) + qty);
    });
    movResult.adjustInQty.forEach((qty, key) => {
      available.set(key, (available.get(key) || 0) + qty);
    });
    movResult.adjustOutQty.forEach((qty, key) => {
      available.set(key, (available.get(key) || 0) - qty);
    });
    return available;
  }
}
