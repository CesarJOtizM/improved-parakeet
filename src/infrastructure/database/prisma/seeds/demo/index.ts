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

    // 6. Stock
    const stockSeed = new DemoStockSeed(this.prisma);
    await stockSeed.seed(orgId, products, warehouses);
    console.log('✅ Stock inicial configurado');

    // Get the admin user for createdBy fields
    const adminUser = users.find(u => u.email === 'admin@nevada-demo.com')!;

    // 7. Movements (IN, OUT, ADJUST)
    const movementsSeed = new DemoMovementsSeed(this.prisma);
    await movementsSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('✅ Movimientos creados');

    // 8. Sales
    const salesSeed = new DemoSalesSeed(this.prisma);
    const sales = await salesSeed.seed(orgId, products, warehouses, users);
    console.log('✅ Ventas:', sales.length);

    // 9. Returns
    const returnsSeed = new DemoReturnsSeed(this.prisma);
    const returns = await returnsSeed.seed(orgId, products, warehouses, sales, adminUser.id);
    console.log('✅ Devoluciones:', returns.length);

    // 10. Transfers
    const transfersSeed = new DemoTransfersSeed(this.prisma);
    const transfers = await transfersSeed.seed(orgId, products, warehouses, adminUser.id);
    console.log('✅ Transferencias:', transfers.length);

    // 11. Audit Logs
    const auditSeed = new DemoAuditLogsSeed(this.prisma);
    await auditSeed.seed(orgId, users);
    console.log('✅ Logs de auditoría creados');

    console.log('\n🎉 Datos de demostración completados!\n');
  }
}
