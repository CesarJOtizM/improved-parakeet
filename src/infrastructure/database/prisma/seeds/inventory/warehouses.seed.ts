import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IWarehouse } from '@shared/types/database.types';

export class WarehousesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string): Promise<IWarehouse[]> {
    const warehousesData = [
      {
        code: 'BODEGA-001',
        name: 'Bodega Principal',
        description: 'Bodega principal de la organización',
        address: 'Calle Principal 123, Ciudad',
        isActive: true,
        orgId: organizationId,
      },
      {
        code: 'BODEGA-002',
        name: 'Bodega Secundaria',
        description: 'Bodega secundaria para productos de alto volumen',
        address: 'Avenida Industrial 456, Zona Industrial',
        isActive: true,
        orgId: organizationId,
      },
      {
        code: 'BODEGA-003',
        name: 'Bodega de Distribución',
        description: 'Bodega para distribución rápida',
        address: 'Calle Comercial 789, Centro',
        isActive: true,
        orgId: organizationId,
      },
    ];

    const warehouses = [];
    for (const warehouseData of warehousesData) {
      const warehouse = await this.prisma.warehouse.upsert({
        where: { code_orgId: { code: warehouseData.code, orgId: warehouseData.orgId } },
        update: {},
        create: warehouseData,
      });
      warehouses.push(warehouse);
    }

    return warehouses;
  }
}
