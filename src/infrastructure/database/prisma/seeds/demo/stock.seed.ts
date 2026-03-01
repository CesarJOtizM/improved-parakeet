import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct } from '@shared/types/database.types';

function getCostRatio(sku: string): number {
  if (sku.startsWith('LAP-') || sku.startsWith('DT-') || sku.startsWith('DOCK-')) return 0.65;
  if (sku.startsWith('TAB-') || sku.startsWith('LIC-')) return 0.7;
  if (sku.startsWith('MON-') || sku.startsWith('IMP-') || sku.startsWith('AP-')) return 0.62;
  if (sku.startsWith('HEADSET-')) return 0.62;
  if (sku.startsWith('CABLE-') || sku.startsWith('FUNDA-')) return 0.45;
  if (sku.startsWith('USB-') || sku.startsWith('TINTA-') || sku.startsWith('MICROSD')) return 0.5;
  if (sku.startsWith('MOUSE-') || sku.startsWith('PARLANTE')) return 0.58;
  if (sku.startsWith('KB-') || sku.startsWith('WEBCAM') || sku.startsWith('BRAZO-')) return 0.6;
  if (sku.startsWith('SSD-') || sku.startsWith('HDD-')) return 0.6;
  if (sku.startsWith('RTR-') || sku.startsWith('SW-')) return 0.58;
  if (sku.startsWith('HUB-') || sku.startsWith('CHRG-') || sku.startsWith('PBANK')) return 0.55;
  if (sku.startsWith('SOPORTE-')) return 0.55;
  if (sku.startsWith('TONER-') || sku.startsWith('PAPEL-')) return 0.55;
  return 0.58;
}

export class DemoStockSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string, products: IProduct[], available: Map<string, number>): Promise<void> {
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const [key, quantity] of available.entries()) {
      if (quantity <= 0) continue;

      const [productId, warehouseId] = key.split('|');
      const product = productMap.get(productId);
      if (!product) continue;

      const price =
        typeof product.price === 'object' && 'toNumber' in product.price
          ? (product.price as { toNumber(): number }).toNumber()
          : Number(product.price);

      const costRatio = getCostRatio(product.sku);
      const unitCost = Math.round(price * costRatio);

      const existing = await this.prisma.stock.findFirst({
        where: { productId, warehouseId, orgId, locationId: null },
      });
      if (existing) continue;

      await this.prisma.stock.create({
        data: {
          productId,
          warehouseId,
          quantity,
          unitCost,
          locationId: null,
          orgId,
        },
      });
    }
  }
}
