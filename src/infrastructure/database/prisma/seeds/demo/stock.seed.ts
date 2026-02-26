import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

// Cost is typically 55-75% of sale price for electronics
const STOCK_MATRIX: {
  skuPrefix: string;
  warehouseIdx: number;
  quantity: number;
  costRatio: number;
}[] = [
  // === Bodega Principal Bogotá (index 0) - main hub ===
  { skuPrefix: 'LAP-DELL', warehouseIdx: 0, quantity: 12, costRatio: 0.65 },
  { skuPrefix: 'LAP-LENOVO', warehouseIdx: 0, quantity: 8, costRatio: 0.65 },
  { skuPrefix: 'LAP-HP', warehouseIdx: 0, quantity: 15, costRatio: 0.65 },
  { skuPrefix: 'LAP-ACER', warehouseIdx: 0, quantity: 10, costRatio: 0.62 },
  { skuPrefix: 'TAB-APPLE', warehouseIdx: 0, quantity: 6, costRatio: 0.7 },
  { skuPrefix: 'DT-DELL', warehouseIdx: 0, quantity: 5, costRatio: 0.65 },
  { skuPrefix: 'MOUSE-LOG-001', warehouseIdx: 0, quantity: 45, costRatio: 0.6 },
  { skuPrefix: 'MOUSE-LOG-002', warehouseIdx: 0, quantity: 120, costRatio: 0.55 },
  { skuPrefix: 'MOUSE-RAZ', warehouseIdx: 0, quantity: 18, costRatio: 0.6 },
  { skuPrefix: 'KB-LOG', warehouseIdx: 0, quantity: 30, costRatio: 0.6 },
  { skuPrefix: 'KB-MECH', warehouseIdx: 0, quantity: 25, costRatio: 0.6 },
  { skuPrefix: 'WEBCAM', warehouseIdx: 0, quantity: 20, costRatio: 0.6 },
  { skuPrefix: 'HEADSET-001', warehouseIdx: 0, quantity: 15, costRatio: 0.65 },
  { skuPrefix: 'HEADSET-002', warehouseIdx: 0, quantity: 35, costRatio: 0.6 },
  { skuPrefix: 'PARLANTE', warehouseIdx: 0, quantity: 22, costRatio: 0.58 },
  { skuPrefix: 'MON-LG-001', warehouseIdx: 0, quantity: 10, costRatio: 0.65 },
  { skuPrefix: 'MON-LG-002', warehouseIdx: 0, quantity: 12, costRatio: 0.63 },
  { skuPrefix: 'MON-DELL', warehouseIdx: 0, quantity: 8, costRatio: 0.65 },
  { skuPrefix: 'MON-SAM', warehouseIdx: 0, quantity: 20, costRatio: 0.6 },
  { skuPrefix: 'MON-BNQ', warehouseIdx: 0, quantity: 14, costRatio: 0.58 },
  { skuPrefix: 'SSD-SAM', warehouseIdx: 0, quantity: 50, costRatio: 0.6 },
  { skuPrefix: 'SSD-NVME', warehouseIdx: 0, quantity: 25, costRatio: 0.62 },
  { skuPrefix: 'HDD-EXT', warehouseIdx: 0, quantity: 40, costRatio: 0.6 },
  { skuPrefix: 'USB-SAN', warehouseIdx: 0, quantity: 200, costRatio: 0.5 },
  { skuPrefix: 'MICROSD', warehouseIdx: 0, quantity: 80, costRatio: 0.48 },
  { skuPrefix: 'CABLE-HDMI', warehouseIdx: 0, quantity: 150, costRatio: 0.45 },
  { skuPrefix: 'CABLE-USBC', warehouseIdx: 0, quantity: 100, costRatio: 0.45 },
  { skuPrefix: 'CABLE-ETH', warehouseIdx: 0, quantity: 300, costRatio: 0.4 },
  { skuPrefix: 'CABLE-DP', warehouseIdx: 0, quantity: 60, costRatio: 0.45 },
  { skuPrefix: 'RTR-TPLINK', warehouseIdx: 0, quantity: 15, costRatio: 0.6 },
  { skuPrefix: 'SW-TPLINK', warehouseIdx: 0, quantity: 25, costRatio: 0.55 },
  { skuPrefix: 'AP-UBIQ', warehouseIdx: 0, quantity: 10, costRatio: 0.62 },
  { skuPrefix: 'HUB-USBC', warehouseIdx: 0, quantity: 40, costRatio: 0.55 },
  { skuPrefix: 'DOCK-001', warehouseIdx: 0, quantity: 6, costRatio: 0.65 },
  { skuPrefix: 'FUNDA-LAP', warehouseIdx: 0, quantity: 60, costRatio: 0.45 },
  { skuPrefix: 'CHRG-USBC', warehouseIdx: 0, quantity: 35, costRatio: 0.55 },
  { skuPrefix: 'PBANK', warehouseIdx: 0, quantity: 50, costRatio: 0.55 },
  { skuPrefix: 'SOPORTE-LAP', warehouseIdx: 0, quantity: 20, costRatio: 0.55 },
  { skuPrefix: 'BRAZO-MON', warehouseIdx: 0, quantity: 10, costRatio: 0.6 },
  { skuPrefix: 'IMP-HP', warehouseIdx: 0, quantity: 5, costRatio: 0.65 },
  { skuPrefix: 'IMP-EPSON', warehouseIdx: 0, quantity: 8, costRatio: 0.6 },
  { skuPrefix: 'IMP-BRO', warehouseIdx: 0, quantity: 6, costRatio: 0.62 },
  { skuPrefix: 'TONER-HP', warehouseIdx: 0, quantity: 30, costRatio: 0.55 },
  { skuPrefix: 'TINTA-EPSON', warehouseIdx: 0, quantity: 45, costRatio: 0.5 },
  { skuPrefix: 'PAPEL-A4', warehouseIdx: 0, quantity: 200, costRatio: 0.55 },
  { skuPrefix: 'LIC-M365', warehouseIdx: 0, quantity: 100, costRatio: 0.7 },
  { skuPrefix: 'LIC-ADOBE', warehouseIdx: 0, quantity: 25, costRatio: 0.75 },
  { skuPrefix: 'LIC-WIN11', warehouseIdx: 0, quantity: 40, costRatio: 0.68 },

  // === Bodega Norte Bogotá (index 1) ===
  { skuPrefix: 'LAP-DELL', warehouseIdx: 1, quantity: 5, costRatio: 0.65 },
  { skuPrefix: 'LAP-HP', warehouseIdx: 1, quantity: 8, costRatio: 0.65 },
  { skuPrefix: 'MOUSE-LOG-001', warehouseIdx: 1, quantity: 20, costRatio: 0.6 },
  { skuPrefix: 'MOUSE-LOG-002', warehouseIdx: 1, quantity: 60, costRatio: 0.55 },
  { skuPrefix: 'KB-LOG', warehouseIdx: 1, quantity: 15, costRatio: 0.6 },
  { skuPrefix: 'MON-SAM', warehouseIdx: 1, quantity: 12, costRatio: 0.6 },
  { skuPrefix: 'CABLE-HDMI', warehouseIdx: 1, quantity: 80, costRatio: 0.45 },
  { skuPrefix: 'CABLE-USBC', warehouseIdx: 1, quantity: 50, costRatio: 0.45 },
  { skuPrefix: 'HUB-USBC', warehouseIdx: 1, quantity: 20, costRatio: 0.55 },
  { skuPrefix: 'PAPEL-A4', warehouseIdx: 1, quantity: 100, costRatio: 0.55 },
  { skuPrefix: 'TONER-HP', warehouseIdx: 1, quantity: 15, costRatio: 0.55 },
  { skuPrefix: 'SSD-SAM', warehouseIdx: 1, quantity: 15, costRatio: 0.6 },
  { skuPrefix: 'IMP-EPSON', warehouseIdx: 1, quantity: 3, costRatio: 0.6 },

  // === Bodega Medellín (index 2) ===
  { skuPrefix: 'LAP-LENOVO', warehouseIdx: 2, quantity: 4, costRatio: 0.65 },
  { skuPrefix: 'LAP-HP', warehouseIdx: 2, quantity: 6, costRatio: 0.65 },
  { skuPrefix: 'LAP-ACER', warehouseIdx: 2, quantity: 5, costRatio: 0.62 },
  { skuPrefix: 'MOUSE-LOG-001', warehouseIdx: 2, quantity: 15, costRatio: 0.6 },
  { skuPrefix: 'MOUSE-LOG-002', warehouseIdx: 2, quantity: 40, costRatio: 0.55 },
  { skuPrefix: 'MON-SAM', warehouseIdx: 2, quantity: 8, costRatio: 0.6 },
  { skuPrefix: 'MON-BNQ', warehouseIdx: 2, quantity: 6, costRatio: 0.58 },
  { skuPrefix: 'SSD-SAM', warehouseIdx: 2, quantity: 20, costRatio: 0.6 },
  { skuPrefix: 'CABLE-HDMI', warehouseIdx: 2, quantity: 50, costRatio: 0.45 },
  { skuPrefix: 'RTR-TPLINK', warehouseIdx: 2, quantity: 8, costRatio: 0.6 },
  { skuPrefix: 'PAPEL-A4', warehouseIdx: 2, quantity: 80, costRatio: 0.55 },
  { skuPrefix: 'TONER-HP', warehouseIdx: 2, quantity: 10, costRatio: 0.55 },
  { skuPrefix: 'HEADSET-002', warehouseIdx: 2, quantity: 12, costRatio: 0.6 },

  // === Bodega Cali (index 3) ===
  { skuPrefix: 'LAP-DELL', warehouseIdx: 3, quantity: 3, costRatio: 0.65 },
  { skuPrefix: 'LAP-HP', warehouseIdx: 3, quantity: 4, costRatio: 0.65 },
  { skuPrefix: 'MOUSE-LOG-002', warehouseIdx: 3, quantity: 30, costRatio: 0.55 },
  { skuPrefix: 'KB-MECH', warehouseIdx: 3, quantity: 10, costRatio: 0.6 },
  { skuPrefix: 'MON-SAM', warehouseIdx: 3, quantity: 6, costRatio: 0.6 },
  { skuPrefix: 'CABLE-HDMI', warehouseIdx: 3, quantity: 40, costRatio: 0.45 },
  { skuPrefix: 'CABLE-ETH', warehouseIdx: 3, quantity: 100, costRatio: 0.4 },
  { skuPrefix: 'PAPEL-A4', warehouseIdx: 3, quantity: 60, costRatio: 0.55 },
  { skuPrefix: 'IMP-EPSON', warehouseIdx: 3, quantity: 2, costRatio: 0.6 },
  { skuPrefix: 'TINTA-EPSON', warehouseIdx: 3, quantity: 15, costRatio: 0.5 },

  // === Bodega Devoluciones (index 4) ===
  { skuPrefix: 'LAP-HP', warehouseIdx: 4, quantity: 2, costRatio: 0.65 },
  { skuPrefix: 'MOUSE-LOG-001', warehouseIdx: 4, quantity: 3, costRatio: 0.6 },
  { skuPrefix: 'HEADSET-002', warehouseIdx: 4, quantity: 5, costRatio: 0.6 },
  { skuPrefix: 'MON-DELL', warehouseIdx: 4, quantity: 1, costRatio: 0.65 },
  { skuPrefix: 'WEBCAM', warehouseIdx: 4, quantity: 2, costRatio: 0.6 },
];

export class DemoStockSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string, products: IProduct[], warehouses: IWarehouse[]): Promise<void> {
    for (const entry of STOCK_MATRIX) {
      const product = products.find(p => p.sku.startsWith(entry.skuPrefix));
      const warehouse = warehouses[entry.warehouseIdx];

      if (!product || !warehouse) continue;

      const price =
        typeof product.price === 'object' && 'toNumber' in product.price
          ? (product.price as { toNumber(): number }).toNumber()
          : Number(product.price);
      const unitCost = Math.round(price * entry.costRatio);

      const existing = await this.prisma.stock.findFirst({
        where: { productId: product.id, warehouseId: warehouse.id, orgId, locationId: null },
      });

      if (existing) continue;

      await this.prisma.stock.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: entry.quantity,
          unitCost,
          locationId: null,
          orgId,
        },
      });
    }
  }
}
