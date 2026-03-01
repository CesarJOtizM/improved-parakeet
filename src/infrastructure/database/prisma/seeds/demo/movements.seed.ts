import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
  return d;
}

export function qtyKey(productId: string, warehouseId: string): string {
  return `${productId}|${warehouseId}`;
}

export interface MovementSeedResult {
  purchasedQty: Map<string, number>;
  adjustInQty: Map<string, number>;
  adjustOutQty: Map<string, number>;
}

// Product groups for realistic purchase orders
const PURCHASE_GROUPS = [
  {
    supplier: 'Dell Colombia',
    reason: 'Compra computadores Dell',
    skus: ['LAP-DELL', 'DT-DELL', 'MON-DELL'],
    qtys: [10, 5, 8],
  },
  {
    supplier: 'Lenovo Colombia',
    reason: 'Compra laptops Lenovo',
    skus: ['LAP-LENOVO'],
    qtys: [12],
  },
  {
    supplier: 'HP Colombia',
    reason: 'Compra equipos HP',
    skus: ['LAP-HP', 'IMP-HP', 'TONER-HP'],
    qtys: [15, 5, 30],
  },
  {
    supplier: 'Logitech Distribuidor',
    reason: 'Compra periféricos Logitech',
    skus: ['MOUSE-LOG-001', 'MOUSE-LOG-002', 'KB-LOG', 'WEBCAM'],
    qtys: [40, 120, 25, 20],
  },
  {
    supplier: 'Ugreen/Anker',
    reason: 'Compra cables y accesorios',
    skus: ['CABLE-HDMI', 'CABLE-USBC', 'CABLE-ETH', 'HUB-USBC', 'CHRG-USBC'],
    qtys: [150, 100, 200, 40, 30],
  },
  {
    supplier: 'Samsung Electronics',
    reason: 'Compra monitores y almacenamiento Samsung',
    skus: ['MON-SAM', 'SSD-SAM', 'SSD-NVME', 'MICROSD'],
    qtys: [15, 30, 20, 50],
  },
  {
    supplier: 'Epson Colombia',
    reason: 'Compra impresoras y tintas Epson',
    skus: ['IMP-EPSON', 'TINTA-EPSON'],
    qtys: [8, 40],
  },
  { supplier: 'Reprograf', reason: 'Compra papel y consumibles', skus: ['PAPEL-A4'], qtys: [300] },
  { supplier: 'Apple Colombia', reason: 'Compra tablets iPad', skus: ['TAB-APPLE'], qtys: [6] },
  {
    supplier: 'TP-Link Distribuidor',
    reason: 'Compra equipos de red',
    skus: ['RTR-TPLINK', 'SW-TPLINK', 'AP-UBIQ'],
    qtys: [10, 15, 8],
  },
  {
    supplier: 'Keychron/HyperX',
    reason: 'Compra periféricos gaming/mecánicos',
    skus: ['KB-MECH', 'HEADSET-002', 'MOUSE-RAZ'],
    qtys: [20, 25, 15],
  },
  {
    supplier: 'Jabra/JBL',
    reason: 'Compra audio profesional',
    skus: ['HEADSET-001', 'PARLANTE'],
    qtys: [12, 20],
  },
  {
    supplier: 'LG Electronics',
    reason: 'Compra monitores LG',
    skus: ['MON-LG-001', 'MON-LG-002'],
    qtys: [8, 10],
  },
  {
    supplier: 'Accesorios varios',
    reason: 'Compra accesorios y fundas',
    skus: ['FUNDA-LAP', 'PBANK', 'SOPORTE-LAP', 'BRAZO-MON'],
    qtys: [30, 25, 15, 8],
  },
  {
    supplier: 'Microsoft/Adobe',
    reason: 'Compra licencias software',
    skus: ['LIC-M365', 'LIC-ADOBE', 'LIC-WIN11'],
    qtys: [50, 15, 30],
  },
  { supplier: 'Acer Colombia', reason: 'Compra laptops Acer', skus: ['LAP-ACER'], qtys: [10] },
  {
    supplier: 'BenQ/Brother',
    reason: 'Compra monitores BenQ e impresoras Brother',
    skus: ['MON-BNQ', 'IMP-BRO'],
    qtys: [12, 6],
  },
  {
    supplier: 'Seagate/Kingston',
    reason: 'Compra almacenamiento externo',
    skus: ['HDD-EXT', 'USB-SAN'],
    qtys: [25, 100],
  },
  {
    supplier: 'CalDigit/Ergotron',
    reason: 'Compra docking stations y soportes',
    skus: ['DOCK-001', 'BRAZO-MON'],
    qtys: [5, 6],
  },
  {
    supplier: 'Cables y conectores',
    reason: 'Reposición cables DisplayPort',
    skus: ['CABLE-DP'],
    qtys: [60],
  },
];

// Reasons for adjustments
const ADJUST_IN_REASONS = [
  'Ajuste por inventario físico - unidades adicionales encontradas',
  'Productos encontrados en zona de recepción sin registrar',
  'Corrección de conteo previo',
  'Devolución interna entre áreas',
  'Producto reacondicionado retorna al inventario',
];

const ADJUST_OUT_REASONS = [
  'Producto dañado por humedad en bodega',
  'Producto defectuoso encontrado en revisión',
  'Muestra para cliente sin cargo',
  'Ajuste por inventario físico - faltante',
  'Pérdida por robo hormiga detectada',
  'Producto vencido / obsoleto',
];

export class DemoMovementsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    orgId: string,
    products: IProduct[],
    warehouses: IWarehouse[],
    adminUserId: string
  ): Promise<MovementSeedResult> {
    const findProduct = (prefix: string) => products.find(p => p.sku.startsWith(prefix));
    const purchasedQty = new Map<string, number>();
    const adjustInQty = new Map<string, number>();
    const adjustOutQty = new Map<string, number>();

    let movIdx = 0;

    // === IN movements: ~25 purchase orders spread over the year ===
    const inDays = [
      350, 335, 320, 305, 290, 275, 260, 245, 230, 215, 200, 185, 170, 155, 140, 125, 110, 95, 80,
      65, 50, 35, 20, 10, 3,
    ];

    for (let i = 0; i < inDays.length; i++) {
      movIdx++;
      const day = inDays[i];
      const group = PURCHASE_GROUPS[i % PURCHASE_GROUPS.length];
      const whIdx = i < 18 ? 0 : i < 21 ? 1 : i < 23 ? 2 : 3; // mostly main warehouse

      const mov = await this.prisma.movement.create({
        data: {
          type: 'IN',
          status: 'POSTED',
          reference: `OC-2025-${String(movIdx).padStart(3, '0')}`,
          reason: group.reason,
          notes: `Proveedor: ${group.supplier} | OC-2025-${String(movIdx).padStart(3, '0')}`,
          warehouseId: warehouses[whIdx].id,
          postedAt: daysAgo(day),
          postedBy: adminUserId,
          createdBy: adminUserId,
          orgId,
          createdAt: daysAgo(day + 1),
        },
      });

      const lines = group.skus
        .map((sku, idx) => {
          const prod = findProduct(sku);
          if (!prod) return null;
          const price =
            typeof prod.price === 'object' && 'toNumber' in prod.price
              ? (prod.price as { toNumber(): number }).toNumber()
              : Number(prod.price);
          return {
            movementId: mov.id,
            productId: prod.id,
            quantity: group.qtys[idx] || 5,
            unitCost: Math.round(price * (0.55 + Math.random() * 0.15)),
            currency: 'COP',
            orgId,
          };
        })
        .filter(Boolean);

      if (lines.length > 0) {
        await this.prisma.movementLine.createMany({
          data: lines as NonNullable<(typeof lines)[0]>[],
        });

        // Track purchased quantities
        for (const line of lines) {
          if (!line) continue;
          const key = qtyKey(line.productId, warehouses[whIdx].id);
          purchasedQty.set(key, (purchasedQty.get(key) || 0) + line.quantity);
        }
      }
    }

    // === ADJUST_IN movements: ~5 ===
    const adjInDays = [280, 200, 140, 70, 25];
    const adjInProducts = [
      ['USB-SAN', 'CABLE-ETH'],
      ['MOUSE-LOG-002', 'CABLE-HDMI'],
      ['PAPEL-A4'],
      ['MICROSD', 'USB-SAN'],
      ['CABLE-USBC', 'CABLE-ETH', 'CABLE-HDMI'],
    ];

    for (let i = 0; i < adjInDays.length; i++) {
      movIdx++;
      const mov = await this.prisma.movement.create({
        data: {
          type: 'ADJUST_IN',
          status: 'POSTED',
          reference: `AJ-IN-2025-${String(movIdx).padStart(3, '0')}`,
          reason: ADJUST_IN_REASONS[i],
          notes: `Ajuste entrada #${movIdx}`,
          warehouseId: warehouses[0].id,
          postedAt: daysAgo(adjInDays[i]),
          postedBy: adminUserId,
          createdBy: adminUserId,
          orgId,
          createdAt: daysAgo(adjInDays[i]),
        },
      });

      const lines = adjInProducts[i]
        .map(sku => {
          const prod = findProduct(sku);
          if (!prod) return null;
          const price =
            typeof prod.price === 'object' && 'toNumber' in prod.price
              ? (prod.price as { toNumber(): number }).toNumber()
              : Number(prod.price);
          return {
            movementId: mov.id,
            productId: prod.id,
            quantity: 3 + i * 2,
            unitCost: Math.round(price * 0.55),
            currency: 'COP',
            orgId,
          };
        })
        .filter(Boolean);

      if (lines.length > 0) {
        await this.prisma.movementLine.createMany({
          data: lines as NonNullable<(typeof lines)[0]>[],
        });

        // Track adjust-in quantities
        for (const line of lines) {
          if (!line) continue;
          const key = qtyKey(line.productId, warehouses[0].id);
          adjustInQty.set(key, (adjustInQty.get(key) || 0) + line.quantity);
        }
      }
    }

    // === ADJUST_OUT movements: ~5 ===
    const adjOutDays = [310, 240, 160, 85, 18];
    const adjOutProducts = [
      ['HEADSET-002', 'MOUSE-LOG-002'],
      ['CABLE-HDMI'],
      ['TINTA-EPSON', 'PAPEL-A4'],
      ['WEBCAM'],
      ['MOUSE-LOG-002', 'CABLE-ETH'],
    ];

    for (let i = 0; i < adjOutDays.length; i++) {
      movIdx++;
      const mov = await this.prisma.movement.create({
        data: {
          type: 'ADJUST_OUT',
          status: 'POSTED',
          reference: `AJ-OUT-2025-${String(movIdx).padStart(3, '0')}`,
          reason: ADJUST_OUT_REASONS[i],
          notes: `Ajuste salida #${movIdx}`,
          warehouseId: warehouses[0].id,
          postedAt: daysAgo(adjOutDays[i]),
          postedBy: adminUserId,
          createdBy: adminUserId,
          orgId,
          createdAt: daysAgo(adjOutDays[i]),
        },
      });

      const lines = adjOutProducts[i]
        .map(sku => {
          const prod = findProduct(sku);
          if (!prod) return null;
          const price =
            typeof prod.price === 'object' && 'toNumber' in prod.price
              ? (prod.price as { toNumber(): number }).toNumber()
              : Number(prod.price);
          return {
            movementId: mov.id,
            productId: prod.id,
            quantity: 1 + i,
            unitCost: Math.round(price * 0.6),
            currency: 'COP',
            orgId,
          };
        })
        .filter(Boolean);

      if (lines.length > 0) {
        await this.prisma.movementLine.createMany({
          data: lines as NonNullable<(typeof lines)[0]>[],
        });

        // Track adjust-out quantities
        for (const line of lines) {
          if (!line) continue;
          const key = qtyKey(line.productId, warehouses[0].id);
          adjustOutQty.set(key, (adjustOutQty.get(key) || 0) + line.quantity);
        }
      }
    }

    // === DRAFT movements: ~3 (recent, pending approval) ===
    const draftDefs = [
      {
        day: 2,
        type: 'IN' as const,
        skus: ['MON-LG-001', 'BRAZO-MON'],
        reason: 'Nueva compra monitores LG - pendiente aprobación',
      },
      {
        day: 1,
        type: 'IN' as const,
        skus: ['LAP-DELL', 'LAP-HP'],
        reason: 'Cotización laptops para proyecto corporativo',
      },
      {
        day: 0,
        type: 'OUT' as const,
        skus: ['SSD-NVME', 'HDD-EXT'],
        reason: 'Salida para pruebas técnicas - por confirmar',
      },
    ];

    for (const def of draftDefs) {
      movIdx++;
      const mov = await this.prisma.movement.create({
        data: {
          type: def.type,
          status: 'DRAFT',
          reference: `DRAFT-2026-${String(movIdx).padStart(3, '0')}`,
          reason: def.reason,
          warehouseId: warehouses[0].id,
          createdBy: adminUserId,
          orgId,
          createdAt: daysAgo(def.day),
        },
      });

      const lines = def.skus
        .map(sku => {
          const prod = findProduct(sku);
          if (!prod) return null;
          const price =
            typeof prod.price === 'object' && 'toNumber' in prod.price
              ? (prod.price as { toNumber(): number }).toNumber()
              : Number(prod.price);
          return {
            movementId: mov.id,
            productId: prod.id,
            quantity: 5 + (movIdx % 6),
            unitCost: Math.round(price * 0.6),
            currency: 'COP',
            orgId,
          };
        })
        .filter(Boolean);

      if (lines.length > 0) {
        await this.prisma.movementLine.createMany({
          data: lines as NonNullable<(typeof lines)[0]>[],
        });
      }
    }

    // === VOID movements: ~2 ===
    for (const day of [190, 45]) {
      movIdx++;
      await this.prisma.movement.create({
        data: {
          type: 'OUT',
          status: 'VOID',
          reference: `VOID-2025-${String(movIdx).padStart(3, '0')}`,
          reason: 'Movimiento anulado - error en registro',
          notes: 'Anulado por el supervisor - datos incorrectos',
          warehouseId: warehouses[0].id,
          createdBy: adminUserId,
          orgId,
          createdAt: daysAgo(day),
        },
      });
    }

    return { purchasedQty, adjustInQty, adjustOutQty };
  }
}
