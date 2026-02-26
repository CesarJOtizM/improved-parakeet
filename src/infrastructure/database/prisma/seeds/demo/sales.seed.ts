import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IUser, IWarehouse } from '@shared/types/database.types';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
  return d;
}

export interface SaleRecord {
  id: string;
  saleNumber: string;
  warehouseId: string;
  status: string;
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

// Product combos for different business types
const PRODUCT_COMBOS = {
  corporate: [
    'LAP-DELL',
    'LAP-LENOVO',
    'MON-DELL',
    'MON-LG-001',
    'MOUSE-LOG-001',
    'KB-LOG',
    'WEBCAM',
    'HEADSET-001',
    'DOCK-001',
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
  ],
  small_biz: [
    'LAP-HP',
    'LAP-LENOVO',
    'MON-SAM',
    'MOUSE-LOG-001',
    'KB-MECH',
    'IMP-EPSON',
    'TINTA-EPSON',
    'PAPEL-A4',
  ],
  consumables: [
    'PAPEL-A4',
    'TONER-HP',
    'TINTA-EPSON',
    'USB-SAN',
    'CABLE-HDMI',
    'CABLE-USBC',
    'CABLE-ETH',
  ],
  accessories: [
    'FUNDA-LAP',
    'CHRG-USBC',
    'PBANK',
    'HUB-USBC',
    'SOPORTE-LAP',
    'BRAZO-MON',
    'MOUSE-RAZ',
    'PARLANTE',
  ],
  networking: ['RTR-TPLINK', 'SW-TPLINK', 'AP-UBIQ', 'CABLE-ETH', 'CABLE-DP'],
  freelancer: [
    'LAP-DELL',
    'MON-DELL',
    'MOUSE-LOG-001',
    'KB-MECH',
    'HEADSET-001',
    'SOPORTE-LAP',
    'BRAZO-MON',
  ],
  software: ['LIC-M365', 'LIC-ADOBE', 'LIC-WIN11'],
  printing: ['IMP-HP', 'IMP-EPSON', 'IMP-BRO', 'TONER-HP', 'TINTA-EPSON', 'PAPEL-A4'],
  storage: ['SSD-SAM', 'SSD-NVME', 'HDD-EXT', 'USB-SAN', 'MICROSD'],
};

const COMBO_KEYS = Object.keys(PRODUCT_COMBOS) as (keyof typeof PRODUCT_COMBOS)[];

export class DemoSalesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    orgId: string,
    products: IProduct[],
    warehouses: IWarehouse[],
    users: IUser[]
  ): Promise<SaleRecord[]> {
    const findProduct = (prefix: string) => products.find(p => p.sku.startsWith(prefix));
    const activeUsers = users.filter(u => u.isActive);
    const salesRecords: SaleRecord[] = [];

    // Generate 100 sales spread over 365 days
    // Distribution: 65 COMPLETED, 8 SHIPPED, 5 PICKING, 7 CONFIRMED, 8 DRAFT, 7 CANCELLED
    const statusDist: { status: string; count: number; minDays: number; maxDays: number }[] = [
      { status: 'COMPLETED', count: 65, minDays: 30, maxDays: 360 },
      { status: 'SHIPPED', count: 8, minDays: 5, maxDays: 25 },
      { status: 'PICKING', count: 5, minDays: 2, maxDays: 10 },
      { status: 'CONFIRMED', count: 7, minDays: 1, maxDays: 8 },
      { status: 'DRAFT', count: 8, minDays: 0, maxDays: 5 },
      { status: 'CANCELLED', count: 7, minDays: 15, maxDays: 300 },
    ];

    let saleIdx = 0;

    for (const dist of statusDist) {
      for (let i = 0; i < dist.count; i++) {
        saleIdx++;
        const saleNumber = `VTA-2025-${String(saleIdx).padStart(4, '0')}`;
        const dayOffset = dist.minDays + Math.floor(Math.random() * (dist.maxDays - dist.minDays));
        const createdAt = daysAgo(dayOffset);
        const customer = CUSTOMERS[saleIdx % CUSTOMERS.length];
        const warehouseIdx =
          saleIdx % 5 < 3 ? 0 : saleIdx % 5 < 4 ? (saleIdx % 3 === 0 ? 2 : 1) : 3;
        const warehouse = warehouses[warehouseIdx];
        const createdBy = activeUsers[saleIdx % activeUsers.length];
        const comboKey = COMBO_KEYS[saleIdx % COMBO_KEYS.length];
        const combo = PRODUCT_COMBOS[comboKey];

        // Pick 2-5 products from the combo
        const numLines = 2 + (saleIdx % 4);
        const lineProducts = combo
          .slice(0, numLines)
          .map(prefix => findProduct(prefix))
          .filter(Boolean);

        if (lineProducts.length === 0) continue;

        const isConfirmed = dist.status !== 'DRAFT';
        const isPicked = ['PICKING', 'SHIPPED', 'COMPLETED'].includes(dist.status);
        const isShipped = ['SHIPPED', 'COMPLETED'].includes(dist.status);
        const isCompleted = dist.status === 'COMPLETED';
        const isCancelled = dist.status === 'CANCELLED';

        const sale = await this.prisma.sale.upsert({
          where: { saleNumber_orgId: { saleNumber, orgId } },
          update: {},
          create: {
            saleNumber,
            status: dist.status,
            warehouseId: warehouse.id,
            customerReference: customer,
            externalReference:
              saleIdx % 3 === 0 ? `PO-${customer.substring(0, 3).toUpperCase()}-${saleIdx}` : null,
            note: saleIdx % 4 === 0 ? `Pedido #${saleIdx} - ${customer}` : null,
            confirmedAt: isConfirmed ? new Date(createdAt.getTime() + 3600000) : null,
            confirmedBy: isConfirmed ? createdBy.id : null,
            pickedAt: isPicked ? new Date(createdAt.getTime() + 7200000) : null,
            pickedBy: isPicked ? createdBy.id : null,
            shippedAt: isShipped ? new Date(createdAt.getTime() + 86400000) : null,
            shippedBy: isShipped ? createdBy.id : null,
            trackingNumber: isShipped ? `TRK-${saleIdx}-${dayOffset}` : null,
            shippingCarrier: isShipped ? CARRIERS[saleIdx % CARRIERS.length] : null,
            completedAt: isCompleted ? new Date(createdAt.getTime() + 172800000) : null,
            completedBy: isCompleted ? createdBy.id : null,
            cancelledAt: isCancelled ? new Date(createdAt.getTime() + 3600000) : null,
            cancelledBy: isCancelled ? createdBy.id : null,
            createdBy: createdBy.id,
            orgId,
            createdAt,
          },
        });

        // Create lines
        const existingLines = await this.prisma.saleLine.count({ where: { saleId: sale.id } });
        if (existingLines === 0) {
          await this.prisma.saleLine.createMany({
            data: lineProducts.map((prod, idx) => {
              const p = prod!;
              const price =
                typeof p.price === 'object' && 'toNumber' in p.price
                  ? (p.price as { toNumber(): number }).toNumber()
                  : Number(p.price);
              return {
                saleId: sale.id,
                productId: p.id,
                quantity: 1 + ((saleIdx + idx) % 8),
                salePrice: price,
                currency: 'COP',
                orgId,
              };
            }),
          });
        }

        salesRecords.push({
          id: sale.id,
          saleNumber,
          warehouseId: warehouse.id,
          status: dist.status,
        });
      }
    }

    return salesRecords;
  }
}
