import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

export class StockSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    organizationId: string,
    products: IProduct[],
    warehouses: IWarehouse[]
  ): Promise<void> {
    const stockData = [
      // Bodega Principal
      {
        productId: products[0].id, // Laptop Dell
        warehouseId: warehouses[0].id,
        quantity: 15,
        unitCost: 1100.0,
        orgId: organizationId,
      },
      {
        productId: products[1].id, // Mouse Logitech
        warehouseId: warehouses[0].id,
        quantity: 50,
        unitCost: 25.0,
        orgId: organizationId,
      },
      {
        productId: products[2].id, // Teclado Mecánico
        warehouseId: warehouses[0].id,
        quantity: 25,
        unitCost: 120.0,
        orgId: organizationId,
      },
      {
        productId: products[3].id, // Monitor LG
        warehouseId: warehouses[0].id,
        quantity: 8,
        unitCost: 350.0,
        orgId: organizationId,
      },

      // Bodega Secundaria
      {
        productId: products[4].id, // Disco Duro
        warehouseId: warehouses[1].id,
        quantity: 100,
        unitCost: 45.0,
        orgId: organizationId,
      },
      {
        productId: products[5].id, // Cable HDMI
        warehouseId: warehouses[1].id,
        quantity: 200,
        unitCost: 8.0,
        orgId: organizationId,
      },
      {
        productId: products[6].id, // Webcam
        warehouseId: warehouses[1].id,
        quantity: 30,
        unitCost: 60.0,
        orgId: organizationId,
      },

      // Bodega de Distribución
      {
        productId: products[7].id, // Auriculares
        warehouseId: warehouses[2].id,
        quantity: 40,
        unitCost: 70.0,
        orgId: organizationId,
      },
      {
        productId: products[0].id, // Laptop Dell (en distribución)
        warehouseId: warehouses[2].id,
        quantity: 5,
        unitCost: 1100.0,
        orgId: organizationId,
      },
    ];

    for (const stockDataItem of stockData) {
      // Find existing stock record
      const existing = await this.prisma.stock.findFirst({
        where: {
          productId: stockDataItem.productId,
          warehouseId: stockDataItem.warehouseId,
          orgId: stockDataItem.orgId,
          locationId: null,
        },
      });

      if (existing) {
        // Already exists, skip
        continue;
      }

      await this.prisma.stock.create({
        data: {
          ...stockDataItem,
          locationId: null,
        },
      });
    }
  }
}
