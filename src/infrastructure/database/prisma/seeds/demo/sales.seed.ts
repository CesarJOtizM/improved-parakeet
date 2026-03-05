import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IUser, IWarehouse } from '@shared/types/database.types';

import { qtyKey } from './movements.seed';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
  return d;
}

function hoursAfter(base: Date, minH: number, maxH: number): Date {
  const offset = minH + Math.random() * (maxH - minH);
  return new Date(base.getTime() + offset * 3600000);
}

function daysAfter(base: Date, minD: number, maxD: number): Date {
  const offset = minD + Math.random() * (maxD - minD);
  return new Date(base.getTime() + offset * 86400000);
}

function getPrice(product: IProduct): number {
  return typeof product.price === 'object' && 'toNumber' in product.price
    ? (product.price as { toNumber(): number }).toNumber()
    : Number(product.price);
}

export interface SaleLineRecord {
  productId: string;
  quantity: number;
  salePrice: number;
}

export interface SaleRecord {
  id: string;
  saleNumber: string;
  warehouseId: string;
  status: string;
  lines: SaleLineRecord[];
}

// Customers pool - realistic Colombian businesses
const CUSTOMERS = [
  'Grupo Empresarial ABC',
  'Universidad Nacional de Colombia',
  'Clínica Medellín SAS',
  'Startup TechNova',
  'Papelería El Punto',
  'Constructora Bolívar',
  'Colegio San José',
  'Oficina de Abogados Restrepo & Asociados',
  'Café Digital Cali',
  'Importadora del Sur',
  'Banco de Occidente - Sede Norte',
  'Almacenes Éxito S.A.',
  'Fundación Cardioinfantil',
  'Hotel Dann Carlton Bogotá',
  'Ministerio de Educación Nacional',
  'Empresa de Energía de Bogotá',
  'Coworking WeWork Bogotá',
  'Agencia de Publicidad Sancho BBDO',
  'Deloitte Colombia',
  'EPM Medellín',
  'Comfama',
  'Nutresa S.A.',
  'Grupo Argos',
  'Ecopetrol S.A.',
  'Davivienda - Oficina Principal',
  'ISA Intercolombia',
  'Celsia Energía',
  'Carvajal Tecnología y Servicios',
  'Universidad de los Andes',
  'Pontificia Universidad Javeriana',
  'Clínica del Country',
  'Hospital Universitario San Ignacio',
  'Fenalco Bogotá',
  'Cámara de Comercio de Cali',
  'Compensar',
  'Colsubsidio',
  'Empresa de Acueducto de Bogotá',
  'Terminal de Transporte Bogotá',
  'Avianca - Centro Administrativo',
  'Rappi Colombia',
  'MercadoLibre Colombia',
  'Freelancer - Andrés Moreno',
  'Freelancer - Diana Muñoz',
  'Freelancer - Santiago Ríos',
  'Estudio Fotográfico Click',
  'Peluquería Arte & Estilo',
  'Restaurante La Leña',
  'Farmacia Dromayor',
  'Gimnasio Iron Fit',
  'Consultorio Odontológico Sonría',
];

const CARRIERS = [
  'Servientrega',
  'Interrapidísimo',
  'Coordinadora',
  'DHL',
  'FedEx',
  'Entrega directa',
  'TCC',
  'Envía',
];

// --- Customer type classification ---
type CustomerType = 'corporate' | 'education' | 'pyme' | 'freelancer';

const CORPORATE_RE =
  /Ecopetrol|Deloitte|EPM|Nutresa|Argos|ISA Inter|Celsia|Avianca|Rappi|MercadoLibre|Banco|Davivienda|Almacenes Éxito|Carvajal|Empresa de Energía/;
const EDUCATION_RE = /Universidad|Colegio|Ministerio de Educación/;
const FREELANCER_RE = /Freelancer/;

function getCustomerType(name: string): CustomerType {
  if (CORPORATE_RE.test(name)) return 'corporate';
  if (EDUCATION_RE.test(name)) return 'education';
  if (FREELANCER_RE.test(name)) return 'freelancer';
  return 'pyme';
}

// [minQtyPerLine, maxQtyPerLine, minLines, maxLines]
const QTY_RANGES: Record<CustomerType, [number, number, number, number]> = {
  corporate: [5, 25, 3, 5],
  education: [10, 40, 2, 4],
  pyme: [2, 8, 2, 4],
  freelancer: [1, 3, 1, 2],
};

// Preferred product SKU prefixes per customer type
const TYPE_PRODUCTS: Record<CustomerType, string[]> = {
  corporate: [
    'LAP-DELL',
    'LAP-LENOVO',
    'MON-DELL',
    'MON-LG-001',
    'MON-SAM',
    'MOUSE-LOG-001',
    'KB-LOG',
    'WEBCAM',
    'HEADSET-001',
    'DOCK-001',
    'DT-DELL',
    'LIC-M365',
    'LIC-ADOBE',
    'LIC-WIN11',
    'RTR-TPLINK',
    'SW-TPLINK',
    'AP-UBIQ',
    'CABLE-ETH',
  ],
  education: [
    'LAP-HP',
    'LAP-ACER',
    'MON-SAM',
    'MON-BNQ',
    'MOUSE-LOG-002',
    'HEADSET-002',
    'CABLE-ETH',
    'SW-TPLINK',
    'RTR-TPLINK',
    'IMP-EPSON',
    'TINTA-EPSON',
    'PAPEL-A4',
    'TONER-HP',
  ],
  pyme: [
    'LAP-HP',
    'LAP-LENOVO',
    'MON-SAM',
    'MOUSE-LOG-001',
    'MOUSE-LOG-002',
    'KB-MECH',
    'IMP-HP',
    'IMP-EPSON',
    'TONER-HP',
    'TINTA-EPSON',
    'PAPEL-A4',
    'FUNDA-LAP',
    'CHRG-USBC',
    'PBANK',
    'HUB-USBC',
    'CABLE-HDMI',
    'CABLE-USBC',
    'CABLE-DP',
    'SOPORTE-LAP',
  ],
  freelancer: [
    'LAP-DELL',
    'LAP-LENOVO',
    'MON-DELL',
    'MON-LG-002',
    'MOUSE-LOG-001',
    'KB-MECH',
    'HEADSET-001',
    'SOPORTE-LAP',
    'BRAZO-MON',
    'SSD-NVME',
    'USB-SAN',
    'FUNDA-LAP',
  ],
};

interface SaleDef {
  status: string;
  dayOffset: number;
  customerIdx: number;
}

export class DemoSalesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    orgId: string,
    products: IProduct[],
    warehouses: IWarehouse[],
    users: IUser[],
    available: Map<string, number>
  ): Promise<SaleRecord[]> {
    const findProduct = (prefix: string) => products.find(p => p.sku.startsWith(prefix));

    // --- Identify users by index (admin=0, supervisor=1, operador=2, vendedor=3) ---
    const admin = users[0]!;
    const supervisor = users[1] || users[0]!;
    const operador = users[2] || users[0]!;
    const vendedor = users[3] || users[0]!;

    const salesRecords: SaleRecord[] = [];

    // --- Generate 95 sale definitions ---
    const defs: SaleDef[] = [];
    let custIdx = 0;

    const statusGroups: { status: string; count: number; minDays: number; maxDays: number }[] = [
      { status: 'COMPLETED', count: 55, minDays: 30, maxDays: 360 },
      { status: 'SHIPPED', count: 10, minDays: 3, maxDays: 15 },
      { status: 'PICKING', count: 6, minDays: 1, maxDays: 4 },
      { status: 'CONFIRMED', count: 6, minDays: 0, maxDays: 2 },
      { status: 'DRAFT', count: 10, minDays: 0, maxDays: 3 },
      { status: 'CANCELLED', count: 8, minDays: 15, maxDays: 300 },
    ];

    for (const group of statusGroups) {
      for (let i = 0; i < group.count; i++) {
        defs.push({
          status: group.status,
          dayOffset:
            group.minDays + Math.floor(Math.random() * (group.maxDays - group.minDays + 1)),
          customerIdx: custIdx++ % CUSTOMERS.length,
        });
      }
    }

    // Sort by dayOffset descending (oldest first → lowest sale numbers)
    defs.sort((a, b) => b.dayOffset - a.dayOffset);

    // --- Process sales with chronological numbering ---
    let seq2025 = 0;
    let seq2026 = 0;

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const createdAt = daysAgo(def.dayOffset);
      const year = createdAt.getFullYear();
      const customer = CUSTOMERS[def.customerIdx];
      const customerType = getCustomerType(customer);

      // Assign sale number by year
      let saleNumber: string;
      if (year <= 2025) {
        seq2025++;
        saleNumber = `SALE-2025-${String(seq2025).padStart(3, '0')}`;
      } else {
        seq2026++;
        saleNumber = `SALE-2026-${String(seq2026).padStart(3, '0')}`;
      }

      // Warehouse distribution: 60% wh0, 15% wh1, 15% wh2, 10% wh3
      const m = i % 20;
      const warehouseIdx = m < 12 ? 0 : m < 15 ? 1 : m < 18 ? 2 : 3;
      const warehouse = warehouses[warehouseIdx];

      // Role-based user assignment for createdBy
      const createdBy = i % 10 < 7 ? vendedor : admin;

      // Get quantity ranges for this customer type
      const [minQty, maxQty, minLines, maxLines] = QTY_RANGES[customerType];

      // Find available products at this warehouse for this customer type
      const typeSkus = TYPE_PRODUCTS[customerType];
      const pool: IProduct[] = typeSkus
        .map(prefix => findProduct(prefix))
        .filter((p): p is IProduct => {
          if (!p) return false;
          const key = qtyKey(p.id, warehouse.id);
          return (available.get(key) || 0) > 0;
        });

      // Fallback: if not enough products, add ANY available product at this warehouse
      if (pool.length < minLines) {
        const existingIds = new Set(pool.map(p => p.id));
        for (const prod of products) {
          if (existingIds.has(prod.id)) continue;
          const key = qtyKey(prod.id, warehouse.id);
          if ((available.get(key) || 0) > 0) {
            pool.push(prod);
            existingIds.add(prod.id);
          }
        }
      }

      if (pool.length === 0) continue;

      // Shuffle and pick lines
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const numLines = Math.min(
        minLines + Math.floor(Math.random() * (maxLines - minLines + 1)),
        shuffled.length
      );
      const selectedProducts = shuffled.slice(0, numLines);

      // Determine if this sale consumes stock
      const consumesStock = ['CONFIRMED', 'PICKING', 'SHIPPED', 'COMPLETED'].includes(def.status);

      // Build sale lines
      const saleLines: SaleLineRecord[] = [];
      for (const prod of selectedProducts) {
        const key = qtyKey(prod.id, warehouse.id);
        const avail = available.get(key) || 0;
        let requestedQty = minQty + Math.floor(Math.random() * (maxQty - minQty + 1));

        if (consumesStock) {
          requestedQty = Math.min(requestedQty, avail);
          if (requestedQty <= 0) continue;
          available.set(key, avail - requestedQty);
        }

        saleLines.push({
          productId: prod.id,
          quantity: requestedQty,
          salePrice: getPrice(prod),
        });
      }

      if (saleLines.length === 0) continue;

      // --- Compute timestamps based on status ---
      const isConfirmed = consumesStock;
      const isPicked = ['PICKING', 'SHIPPED', 'COMPLETED'].includes(def.status);
      const isShipped = ['SHIPPED', 'COMPLETED'].includes(def.status);
      const isCompleted = def.status === 'COMPLETED';
      const isCancelled = def.status === 'CANCELLED';

      const confirmedAt = isConfirmed ? hoursAfter(createdAt, 2, 24) : null;
      const pickedAt = isPicked && confirmedAt ? hoursAfter(confirmedAt, 1, 8) : null;
      const shippedAt = isShipped && pickedAt ? hoursAfter(pickedAt, 4, 48) : null;
      const completedAt = isCompleted && shippedAt ? daysAfter(shippedAt, 1, 7) : null;
      const cancelledAt = isCancelled ? hoursAfter(createdAt, 1, 48) : null;

      // Role-based user assignments per transition
      const confirmedById = isConfirmed ? (i % 2 === 0 ? admin.id : supervisor.id) : null;
      const pickedById = isPicked ? operador.id : null;
      const shippedById = isShipped ? (i % 5 < 3 ? operador.id : supervisor.id) : null;
      const completedById = isCompleted ? (i % 5 < 3 ? admin.id : supervisor.id) : null;
      const cancelledById = isCancelled ? (i % 3 < 2 ? admin.id : supervisor.id) : null;

      const sale = await this.prisma.sale.upsert({
        where: { saleNumber_orgId: { saleNumber, orgId } },
        update: {},
        create: {
          saleNumber,
          status: def.status,
          warehouseId: warehouse.id,
          customerReference: customer,
          externalReference:
            i % 3 === 0 ? `PO-${customer.substring(0, 3).toUpperCase()}-${i + 1}` : null,
          note: i % 4 === 0 ? `Pedido #${i + 1} - ${customer}` : null,
          confirmedAt,
          confirmedBy: confirmedById,
          pickedAt,
          pickedBy: pickedById,
          shippedAt,
          shippedBy: shippedById,
          trackingNumber: isShipped ? `TRK-${year}-${String(i + 1).padStart(4, '0')}` : null,
          shippingCarrier: isShipped ? CARRIERS[i % CARRIERS.length] : null,
          completedAt,
          completedBy: completedById,
          cancelledAt,
          cancelledBy: cancelledById,
          createdBy: createdBy.id,
          orgId,
          createdAt,
        },
      });

      // Create sale lines
      const existingLines = await this.prisma.saleLine.count({ where: { saleId: sale.id } });
      if (existingLines === 0) {
        await this.prisma.saleLine.createMany({
          data: saleLines.map(line => ({
            saleId: sale.id,
            productId: line.productId,
            quantity: line.quantity,
            salePrice: line.salePrice,
            currency: 'COP',
            orgId,
          })),
        });
      }

      // --- Create Movement OUT for confirmed+ sales ---
      if (consumesStock && confirmedAt) {
        const mov = await this.prisma.movement.create({
          data: {
            type: 'OUT',
            status: 'POSTED',
            reference: saleNumber,
            reason: `Salida por venta ${saleNumber}`,
            warehouseId: warehouse.id,
            postedAt: confirmedAt,
            postedBy: confirmedById!,
            createdBy: createdBy.id,
            orgId,
            createdAt: confirmedAt,
          },
        });

        await this.prisma.movementLine.createMany({
          data: saleLines.map(line => ({
            movementId: mov.id,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: Math.round(line.salePrice * 0.65),
            currency: 'COP',
            orgId,
          })),
        });

        // Link sale to movement
        await this.prisma.sale.update({
          where: { id: sale.id },
          data: { movementId: mov.id },
        });
      }

      salesRecords.push({
        id: sale.id,
        saleNumber,
        warehouseId: warehouse.id,
        status: def.status,
        lines: saleLines,
      });
    }

    // Sync DocumentNumberSequence for both years
    if (seq2025 > 0) {
      await this.prisma.documentNumberSequence.upsert({
        where: { orgId_type_year: { orgId, type: 'SALE', year: 2025 } },
        update: { lastSequence: seq2025 },
        create: { orgId, type: 'SALE', year: 2025, lastSequence: seq2025 },
      });
    }
    if (seq2026 > 0) {
      await this.prisma.documentNumberSequence.upsert({
        where: { orgId_type_year: { orgId, type: 'SALE', year: 2026 } },
        update: { lastSequence: seq2026 },
        create: { orgId, type: 'SALE', year: 2026, lastSequence: seq2026 },
      });
    }

    return salesRecords;
  }
}
