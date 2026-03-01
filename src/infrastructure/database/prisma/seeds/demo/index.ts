/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';

import { DemoAuditLogsSeed } from './audit-logs.seed';
import { DemoCategoriesSeed } from './categories.seed';
import { DemoMovementsSeed } from './movements.seed';
import { DemoOrganizationSeed } from './organization.seed';
import { DemoProductsSeed } from './products.seed';
import { DemoReturnsSeed } from './returns.seed';
import { DemoSalesSeed } from './sales.seed';
import { DemoStockSeed } from './stock.seed';
import { DemoTransfersSeed } from './transfers.seed';
import { DemoUsersSeed } from './users.seed';
import { DemoWarehousesSeed } from './warehouses.seed';

export class DemoSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<void> {
    console.log('\n🏢 Sembrando datos de demostración...\n');

    // 1. Organization
    const orgSeed = new DemoOrganizationSeed(this.prisma);
    const org = await orgSeed.seed();
    const orgId = org.id;
    console.log('✅ Organización demo:', org.name);

    // 2. Users (needs roles from auth seed)
    const usersSeed = new DemoUsersSeed(this.prisma);
    const users = await usersSeed.seed(orgId);
    console.log('✅ Usuarios demo:', users.length);

    // 3. Categories
    const categoriesSeed = new DemoCategoriesSeed(this.prisma);
    const categories = await categoriesSeed.seed(orgId);
    console.log('✅ Categorías:', categories.length);

    // 4. Warehouses
    const warehousesSeed = new DemoWarehousesSeed(this.prisma);
    const warehouses = await warehousesSeed.seed(orgId);
    console.log('✅ Bodegas:', warehouses.length);

    // 5. Products (with categories)
    const productsSeed = new DemoProductsSeed(this.prisma);
    const products = await productsSeed.seed(orgId, categories);
    console.log('✅ Productos:', products.length);

    // Get the admin user for createdBy fields
    const adminUser = users.find(u => u.email === 'admin@nevada-demo.com')!;

    // 6. Movements (IN, ADJUST — no OUT, those come from sales)
    const movementsSeed = new DemoMovementsSeed(this.prisma);
    const movResult = await movementsSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('✅ Movimientos creados (compras + ajustes)');

    // Compute available stock: purchased + adjustIn - adjustOut
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

    // 7. Sales (creates Movement OUT per confirmed sale, decrements available)
    const salesSeed = new DemoSalesSeed(this.prisma);
    const sales = await salesSeed.seed(orgId, products, warehouses, users, available);
    console.log('✅ Ventas:', sales.length, '(con movimientos OUT enlazados)');

    // 8. Returns (uses actual sale lines for customer returns)
    const returnsSeed = new DemoReturnsSeed(this.prisma);
    const returns = await returnsSeed.seed(orgId, products, warehouses, sales, adminUser.id);
    console.log('✅ Devoluciones:', returns.length);

    // 9. Transfers
    const transfersSeed = new DemoTransfersSeed(this.prisma);
    const transfers = await transfersSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('✅ Transferencias:', transfers.length);

    // 10. Stock (calculated from available = purchased + adjustIn - adjustOut - sold)
    const stockSeed = new DemoStockSeed(this.prisma);
    await stockSeed.seed(orgId, products, available);
    console.log('✅ Stock calculado (consistente con compras y ventas)');

    // 11. Audit Logs
    const auditSeed = new DemoAuditLogsSeed(this.prisma);
    await auditSeed.seed(orgId, users);
    console.log('✅ Logs de auditoría creados');

    console.log('\n🎉 Datos de demostración completados!\n');
  }
}
