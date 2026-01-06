/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IInventorySeedResult } from '@shared/types/database.types';

import { MovementsSeed } from './movements.seed';
import { ProductsSeed } from './products.seed';
import { StockSeed } from './stock.seed';
import { WarehousesSeed } from './warehouses.seed';

export class InventorySeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string): Promise<IInventorySeedResult> {
    console.log('🌱 Sembrando dominio de inventario...');

    // Crear bodegas
    const warehousesSeed = new WarehousesSeed(this.prisma);
    const warehouses = await warehousesSeed.seed(organizationId);
    console.log(
      '✅ Bodegas creadas:',
      warehouses.map(w => w.name)
    );

    // Crear productos
    const productsSeed = new ProductsSeed(this.prisma);
    const products = await productsSeed.seed(organizationId);
    console.log(
      '✅ Productos creados:',
      products.map(p => p.name)
    );

    // Crear stock inicial
    const stockSeed = new StockSeed(this.prisma);
    await stockSeed.seed(organizationId, products, warehouses);
    console.log('✅ Stock inicial creado');

    // Crear movimientos de ejemplo
    const movementsSeed = new MovementsSeed(this.prisma);
    await movementsSeed.seed(organizationId, products, warehouses);
    console.log('✅ Movimientos de ejemplo creados');

    return { warehouses, products };
  }
}
