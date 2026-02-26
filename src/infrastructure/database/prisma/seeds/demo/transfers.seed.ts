import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
  return d;
}

interface TransferRecord {
  id: string;
}

// Routes: [fromIdx, toIdx, note]
const ROUTES: [number, number, string][] = [
  [0, 1, 'Bogotá Principal → Bogotá Norte'],
  [0, 2, 'Bogotá Principal → Medellín'],
  [0, 3, 'Bogotá Principal → Cali'],
  [1, 2, 'Bogotá Norte → Medellín'],
  [1, 3, 'Bogotá Norte → Cali'],
  [2, 0, 'Medellín → Bogotá Principal'],
  [2, 3, 'Medellín → Cali'],
  [3, 0, 'Cali → Bogotá Principal'],
];

// Product sets per transfer
const TRANSFER_PRODUCTS = [
  ['MOUSE-LOG-001', 'KB-LOG', 'CABLE-HDMI', 'RTR-TPLINK'],
  ['LAP-DELL', 'MON-SAM', 'CABLE-ETH'],
  ['LAP-HP', 'MOUSE-LOG-002', 'PAPEL-A4', 'TONER-HP'],
  ['SSD-SAM', 'HDD-EXT', 'USB-SAN', 'CABLE-USBC'],
  ['IMP-EPSON', 'TINTA-EPSON', 'PAPEL-A4'],
  ['MON-LG-001', 'BRAZO-MON'],
  ['LAP-LENOVO', 'MOUSE-LOG-001', 'KB-MECH'],
  ['HEADSET-001', 'WEBCAM', 'HUB-USBC'],
  ['CHRG-USBC', 'PBANK', 'FUNDA-LAP', 'SOPORTE-LAP'],
  ['LAP-ACER', 'MON-BNQ', 'MOUSE-LOG-002'],
  ['TAB-APPLE', 'CHRG-USBC'],
  ['SW-TPLINK', 'AP-UBIQ', 'CABLE-ETH'],
  ['MON-SAM', 'CABLE-HDMI', 'CABLE-DP'],
  ['LAP-HP', 'DOCK-001'],
  ['HEADSET-002', 'MOUSE-RAZ', 'KB-MECH'],
  ['LIC-M365', 'LIC-WIN11'],
  ['TONER-HP', 'PAPEL-A4', 'TINTA-EPSON'],
  ['LAP-DELL', 'MON-DELL', 'MOUSE-LOG-001'],
  ['SSD-NVME', 'MICROSD', 'USB-SAN'],
  ['IMP-HP', 'IMP-BRO', 'TONER-HP'],
];

export class DemoTransfersSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    orgId: string,
    products: IProduct[],
    warehouses: IWarehouse[],
    adminUserId: string
  ): Promise<TransferRecord[]> {
    const findProduct = (prefix: string) => products.find(p => p.sku.startsWith(prefix));
    const records: TransferRecord[] = [];

    // 20 transfers: 10 RECEIVED, 3 IN_TRANSIT, 3 DRAFT, 2 CANCELED, 2 PARTIAL
    const defs: { status: string; count: number; minDays: number; maxDays: number }[] = [
      { status: 'RECEIVED', count: 10, minDays: 20, maxDays: 340 },
      { status: 'IN_TRANSIT', count: 3, minDays: 1, maxDays: 8 },
      { status: 'DRAFT', count: 3, minDays: 0, maxDays: 3 },
      { status: 'CANCELED', count: 2, minDays: 30, maxDays: 200 },
      { status: 'PARTIAL', count: 2, minDays: 10, maxDays: 60 },
    ];

    let tIdx = 0;

    for (const def of defs) {
      for (let i = 0; i < def.count; i++) {
        tIdx++;
        const dayOffset =
          def.minDays + Math.floor((def.maxDays - def.minDays) * (i / Math.max(def.count - 1, 1)));
        const createdAt = daysAgo(dayOffset);
        const route = ROUTES[tIdx % ROUTES.length];
        const prods = TRANSFER_PRODUCTS[tIdx % TRANSFER_PRODUCTS.length];

        const isReceived = def.status === 'RECEIVED' || def.status === 'PARTIAL';
        const isInitiated = def.status !== 'DRAFT';

        const transfer = await this.prisma.transfer.create({
          data: {
            fromWarehouseId: warehouses[route[0]].id,
            toWarehouseId: warehouses[route[1]].id,
            status: def.status,
            note: `${route[2]} - Transferencia #${tIdx}`,
            initiatedAt: isInitiated ? createdAt : null,
            receivedAt: isReceived ? new Date(createdAt.getTime() + 86400000 * 2) : null,
            receivedBy: isReceived ? adminUserId : null,
            createdBy: adminUserId,
            orgId,
            createdAt,
          },
        });

        const lines = prods
          .map(sku => {
            const prod = findProduct(sku);
            if (!prod) return null;
            return {
              transferId: transfer.id,
              productId: prod.id,
              quantity: 2 + (tIdx % 10),
              orgId,
            };
          })
          .filter(Boolean);

        if (lines.length > 0) {
          await this.prisma.transferLine.createMany({
            data: lines as NonNullable<(typeof lines)[0]>[],
          });
        }

        records.push({ id: transfer.id });
      }
    }

    return records;
  }
}
