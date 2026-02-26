import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IWarehouse } from '@shared/types/database.types';

const WAREHOUSES = [
  {
    code: 'BOG-MAIN',
    name: 'Bodega Principal Bogotá',
    description: 'Centro de distribución principal en Bogotá',
    address: 'Cra 45 #26-85, Zona Industrial, Bogotá',
  },
  {
    code: 'BOG-NORTH',
    name: 'Bodega Norte Bogotá',
    description: 'Punto de distribución zona norte de Bogotá',
    address: 'Autopista Norte Km 12, Bogotá',
  },
  {
    code: 'MED-01',
    name: 'Bodega Medellín',
    description: 'Centro de distribución Antioquia',
    address: 'Calle 30 #43A-30, Medellín',
  },
  {
    code: 'CAL-01',
    name: 'Bodega Cali',
    description: 'Centro de distribución Valle del Cauca',
    address: 'Av. 3N #50-25, Cali',
  },
  {
    code: 'DEVOLUCIONES',
    name: 'Bodega de Devoluciones',
    description: 'Almacén de productos devueltos pendientes de revisión',
    address: 'Cra 45 #26-90, Zona Industrial, Bogotá',
  },
];

export class DemoWarehousesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string): Promise<IWarehouse[]> {
    const warehouses: IWarehouse[] = [];

    for (const wh of WAREHOUSES) {
      const warehouse = await this.prisma.warehouse.upsert({
        where: { code_orgId: { code: wh.code, orgId } },
        update: {},
        create: {
          ...wh,
          isActive: true,
          orgId,
        },
      });
      warehouses.push(warehouse as unknown as IWarehouse);
    }

    return warehouses;
  }
}
