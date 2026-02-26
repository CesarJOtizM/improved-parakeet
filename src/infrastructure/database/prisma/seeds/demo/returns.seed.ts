import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

import { SaleRecord } from './sales.seed';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
}

const CUSTOMER_RETURN_REASONS = [
  'Producto defectuoso - pantalla con píxeles muertos',
  'Producto no cumple especificaciones solicitadas',
  'Falla de hardware - equipo no enciende',
  'Error en el pedido - producto equivocado',
  'Producto llegó dañado en el transporte',
  'Incompatibilidad con sistemas existentes',
  'Cliente desistió de la compra dentro del plazo',
  'Producto diferente al mostrado en catálogo',
  'Defecto de fábrica encontrado en uso',
  'Rendimiento inferior al esperado',
];

const SUPPLIER_RETURN_REASONS = [
  'Lote defectuoso - conectores sueltos',
  'Producto no es original como se solicitó',
  'Fecha de manufactura anterior a la acordada',
  'Empaque dañado - humedad en caja',
  'Modelo enviado diferente al ordenado',
  'Cantidad entregada menor a la facturada',
  'Certificación faltante en el lote',
  'Producto presenta oxidación prematura',
];

const RETURN_PRODUCTS_CUSTOMER = [
  ['MON-DELL'],
  ['HEADSET-002'],
  ['LAP-DELL'],
  ['MOUSE-LOG-001'],
  ['LAP-HP', 'MOUSE-LOG-002'],
  ['WEBCAM'],
  ['KB-MECH'],
  ['MON-SAM'],
  ['HEADSET-001'],
  ['TAB-APPLE'],
  ['LAP-LENOVO'],
  ['PARLANTE'],
];

const RETURN_PRODUCTS_SUPPLIER = [
  ['CABLE-HDMI'],
  ['TONER-HP'],
  ['MOUSE-LOG-002', 'CABLE-USBC'],
  ['TINTA-EPSON'],
  ['CABLE-ETH'],
  ['USB-SAN'],
  ['MICROSD'],
  ['PBANK'],
];

export class DemoReturnsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    orgId: string,
    products: IProduct[],
    warehouses: IWarehouse[],
    sales: SaleRecord[],
    adminUserId: string
  ): Promise<ReturnRecord[]> {
    const findProduct = (prefix: string) => products.find(p => p.sku.startsWith(prefix));
    const completedSales = sales.filter(s => s.status === 'COMPLETED');
    const records: ReturnRecord[] = [];
    let retIdx = 0;

    // Distribution: 8 customer CONFIRMED, 4 supplier CONFIRMED, 3 customer DRAFT, 2 supplier DRAFT, 3 CANCELLED = 20
    const defs: {
      type: string;
      status: string;
      count: number;
      minDays: number;
      maxDays: number;
      isCustomer: boolean;
    }[] = [
      {
        type: 'RETURN_CUSTOMER',
        status: 'CONFIRMED',
        count: 8,
        minDays: 25,
        maxDays: 330,
        isCustomer: true,
      },
      {
        type: 'RETURN_SUPPLIER',
        status: 'CONFIRMED',
        count: 4,
        minDays: 30,
        maxDays: 300,
        isCustomer: false,
      },
      {
        type: 'RETURN_CUSTOMER',
        status: 'DRAFT',
        count: 3,
        minDays: 1,
        maxDays: 15,
        isCustomer: true,
      },
      {
        type: 'RETURN_SUPPLIER',
        status: 'DRAFT',
        count: 2,
        minDays: 1,
        maxDays: 10,
        isCustomer: false,
      },
      {
        type: 'RETURN_CUSTOMER',
        status: 'CANCELLED',
        count: 3,
        minDays: 20,
        maxDays: 250,
        isCustomer: true,
      },
    ];

    for (const def of defs) {
      for (let i = 0; i < def.count; i++) {
        retIdx++;
        const returnNumber = `RETURN-2025-${String(retIdx).padStart(3, '0')}`;
        const dayOffset = def.minDays + Math.floor(Math.random() * (def.maxDays - def.minDays));
        const createdAt = daysAgo(dayOffset);

        const isConfirmed = def.status === 'CONFIRMED';
        const isCancelled = def.status === 'CANCELLED';

        // Customer returns link to a completed sale when available
        const saleId =
          def.isCustomer && completedSales.length > 0
            ? completedSales[retIdx % completedSales.length].id
            : null;

        const reasons = def.isCustomer ? CUSTOMER_RETURN_REASONS : SUPPLIER_RETURN_REASONS;
        const productSkus = def.isCustomer
          ? RETURN_PRODUCTS_CUSTOMER[retIdx % RETURN_PRODUCTS_CUSTOMER.length]
          : RETURN_PRODUCTS_SUPPLIER[retIdx % RETURN_PRODUCTS_SUPPLIER.length];

        const ret = await this.prisma.return.upsert({
          where: { returnNumber_orgId: { returnNumber, orgId } },
          update: {},
          create: {
            returnNumber,
            status: def.status,
            type: def.type,
            reason: reasons[retIdx % reasons.length],
            warehouseId: def.isCustomer ? warehouses[4].id : warehouses[0].id,
            saleId: def.isCustomer ? saleId : null,
            note: `Devolución #${retIdx} - ${def.type === 'RETURN_CUSTOMER' ? 'Cliente' : 'Proveedor'}`,
            confirmedAt: isConfirmed ? new Date(createdAt.getTime() + 86400000 * 2) : null,
            cancelledAt: isCancelled ? new Date(createdAt.getTime() + 86400000) : null,
            createdBy: adminUserId,
            orgId,
            createdAt,
          },
        });

        const existingLines = await this.prisma.returnLine.count({ where: { returnId: ret.id } });
        if (existingLines === 0) {
          const lines = productSkus
            .map(sku => {
              const prod = findProduct(sku);
              if (!prod) return null;
              const price =
                typeof prod.price === 'object' && 'toNumber' in prod.price
                  ? (prod.price as { toNumber(): number }).toNumber()
                  : Number(prod.price);
              return {
                returnId: ret.id,
                productId: prod.id,
                quantity: 1 + (retIdx % 3),
                originalSalePrice: def.isCustomer ? price : null,
                originalUnitCost: !def.isCustomer ? Math.round(price * 0.6) : null,
                currency: 'COP',
                orgId,
              };
            })
            .filter(Boolean);

          if (lines.length > 0) {
            await this.prisma.returnLine.createMany({
              data: lines as NonNullable<(typeof lines)[0]>[],
            });
          }
        }

        records.push({ id: ret.id, returnNumber });
      }
    }

    // Sync DocumentNumberSequence so API-created returns continue from the right number
    await this.prisma.documentNumberSequence.upsert({
      where: { orgId_type_year: { orgId, type: 'RETURN', year: 2025 } },
      update: { lastSequence: retIdx },
      create: { orgId, type: 'RETURN', year: 2025, lastSequence: retIdx },
    });

    return records;
  }
}
