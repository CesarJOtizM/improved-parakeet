import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct, IWarehouse } from '@shared/types/database.types';

export class MovementsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(
    organizationId: string,
    products: IProduct[],
    warehouses: IWarehouse[]
  ): Promise<void> {
    // Find admin user for createdBy field
    const adminUser = await this.prisma.user.findFirst({
      where: {
        orgId: organizationId,
        userRoles: {
          some: {
            role: {
              name: 'ADMIN',
            },
          },
        },
      },
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please ensure auth seed is run first.');
    }

    const firstWarehouseId = warehouses[0].id;

    // Movimiento de entrada inicial
    const initialMovement = await this.prisma.movement.create({
      data: {
        type: 'IN',
        status: 'POSTED',
        reference: 'INITIAL-STOCK-001',
        notes: 'Stock inicial del sistema',
        warehouseId: firstWarehouseId,
        createdBy: adminUser.id,
        orgId: organizationId,
      },
    });

    // Líneas del movimiento inicial
    await this.prisma.movementLine.createMany({
      data: [
        {
          movementId: initialMovement.id,
          productId: products[0].id, // Laptop
          quantity: 15,
          unitCost: 1100.0,
          currency: 'COP',
          orgId: organizationId,
        },
        {
          movementId: initialMovement.id,
          productId: products[1].id, // Mouse
          quantity: 50,
          unitCost: 25.0,
          currency: 'COP',
          orgId: organizationId,
        },
        {
          movementId: initialMovement.id,
          productId: products[2].id, // Teclado
          quantity: 25,
          unitCost: 120.0,
          currency: 'COP',
          orgId: organizationId,
        },
      ],
    });

    // Movimiento de salida (venta)
    const saleMovement = await this.prisma.movement.create({
      data: {
        type: 'OUT',
        status: 'POSTED',
        reference: 'SALE-001',
        notes: 'Venta a cliente corporativo',
        warehouseId: firstWarehouseId,
        createdBy: adminUser.id,
        orgId: organizationId,
      },
    });

    // Líneas del movimiento de venta
    await this.prisma.movementLine.createMany({
      data: [
        {
          movementId: saleMovement.id,
          productId: products[0].id, // Laptop
          quantity: 2,
          unitCost: 1100.0,
          currency: 'COP',
          orgId: organizationId,
        },
        {
          movementId: saleMovement.id,
          productId: products[1].id, // Mouse
          quantity: 5,
          unitCost: 25.0,
          currency: 'COP',
          orgId: organizationId,
        },
      ],
    });

    // Movimiento de ajuste
    const adjustmentMovement = await this.prisma.movement.create({
      data: {
        type: 'ADJUSTMENT',
        status: 'POSTED',
        reference: 'ADJUSTMENT-001',
        notes: 'Ajuste por inventario físico',
        warehouseId: firstWarehouseId,
        createdBy: adminUser.id,
        orgId: organizationId,
      },
    });

    // Líneas del movimiento de ajuste
    await this.prisma.movementLine.createMany({
      data: [
        {
          movementId: adjustmentMovement.id,
          productId: products[5].id, // Cable HDMI
          quantity: -5, // Ajuste negativo
          unitCost: 8.0,
          currency: 'COP',
          orgId: organizationId,
        },
      ],
    });
  }
}
