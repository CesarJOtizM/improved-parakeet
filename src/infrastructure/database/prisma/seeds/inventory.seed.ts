/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IInventorySeedResult, IProduct, IWarehouse } from '@shared/types/database.types';

export class InventorySeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string): Promise<IInventorySeedResult> {
    console.log('🌱 Sembrando dominio de inventario...');

    // Crear bodegas
    const warehouses = await this.createWarehouses(organizationId);
    console.log(
      '✅ Bodegas creadas:',
      warehouses.map(w => w.name)
    );

    // Crear productos
    const products = await this.createProducts(organizationId);
    console.log(
      '✅ Productos creados:',
      products.map(p => p.name)
    );

    // Crear stock inicial
    await this.createInitialStock(organizationId, products, warehouses);
    console.log('✅ Stock inicial creado');

    // Crear movimientos de ejemplo
    await this.createSampleMovements(organizationId, products, warehouses);
    console.log('✅ Movimientos de ejemplo creados');

    return { warehouses, products };
  }

  private async createWarehouses(organizationId: string): Promise<IWarehouse[]> {
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

  private async createProducts(organizationId: string): Promise<IProduct[]> {
    const productsData = [
      {
        sku: 'PROD-001',
        name: 'Laptop Dell XPS 13',
        description: 'Laptop ultrabook de 13 pulgadas con procesador Intel i7',
        category: 'Electrónicos',
        unit: 'Unidad',
        price: 1299.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-002',
        name: 'Mouse Inalámbrico Logitech',
        description: 'Mouse inalámbrico ergonómico con sensor óptico',
        category: 'Accesorios',
        unit: 'Unidad',
        price: 29.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-003',
        name: 'Teclado Mecánico RGB',
        description: 'Teclado mecánico con switches Cherry MX y iluminación RGB',
        category: 'Accesorios',
        unit: 'Unidad',
        price: 149.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-004',
        name: 'Monitor LG 27" 4K',
        description: 'Monitor de 27 pulgadas con resolución 4K UHD',
        category: 'Monitores',
        unit: 'Unidad',
        price: 399.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-005',
        name: 'Disco Duro Externo 1TB',
        description: 'Disco duro externo portátil de 1TB USB 3.0',
        category: 'Almacenamiento',
        unit: 'Unidad',
        price: 59.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-006',
        name: 'Cable HDMI 2.0',
        description: 'Cable HDMI de alta velocidad para 4K',
        category: 'Cables',
        unit: 'Unidad',
        price: 12.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-007',
        name: 'Webcam HD 1080p',
        description: 'Webcam de alta definición con micrófono integrado',
        category: 'Accesorios',
        unit: 'Unidad',
        price: 79.99,
        isActive: true,
        orgId: organizationId,
      },
      {
        sku: 'PROD-008',
        name: 'Auriculares Gaming',
        description: 'Auriculares gaming con micrófono y sonido envolvente',
        category: 'Audio',
        unit: 'Unidad',
        price: 89.99,
        isActive: true,
        orgId: organizationId,
      },
    ];

    const products = [];
    for (const productData of productsData) {
      const product = await this.prisma.product.upsert({
        where: { sku_orgId: { sku: productData.sku, orgId: productData.orgId } },
        update: {},
        create: productData,
      });
      // Convert Decimal price to number for IProduct interface
      const productWithNumberPrice = {
        ...product,
        price: product.price
          ? typeof product.price === 'object'
            ? product.price.toNumber()
            : product.price
          : 0,
      };
      products.push(productWithNumberPrice);
    }

    return products;
  }

  private async createInitialStock(
    organizationId: string,
    products: IProduct[],
    warehouses: IWarehouse[]
  ): Promise<void> {
    const stockData = [
      // Bodega Principal
      {
        productId: products[0].id, // Laptop Dell
        warehouseId: warehouses[0].id,
        quantity: 15,
        unitCost: 1100.0,
        orgId: organizationId,
      },
      {
        productId: products[1].id, // Mouse Logitech
        warehouseId: warehouses[0].id,
        quantity: 50,
        unitCost: 25.0,
        orgId: organizationId,
      },
      {
        productId: products[2].id, // Teclado Mecánico
        warehouseId: warehouses[0].id,
        quantity: 25,
        unitCost: 120.0,
        orgId: organizationId,
      },
      {
        productId: products[3].id, // Monitor LG
        warehouseId: warehouses[0].id,
        quantity: 8,
        unitCost: 350.0,
        orgId: organizationId,
      },

      // Bodega Secundaria
      {
        productId: products[4].id, // Disco Duro
        warehouseId: warehouses[1].id,
        quantity: 100,
        unitCost: 45.0,
        orgId: organizationId,
      },
      {
        productId: products[5].id, // Cable HDMI
        warehouseId: warehouses[1].id,
        quantity: 200,
        unitCost: 8.0,
        orgId: organizationId,
      },
      {
        productId: products[6].id, // Webcam
        warehouseId: warehouses[1].id,
        quantity: 30,
        unitCost: 60.0,
        orgId: organizationId,
      },

      // Bodega de Distribución
      {
        productId: products[7].id, // Auriculares
        warehouseId: warehouses[2].id,
        quantity: 40,
        unitCost: 70.0,
        orgId: organizationId,
      },
      {
        productId: products[0].id, // Laptop Dell (en distribución)
        warehouseId: warehouses[2].id,
        quantity: 5,
        unitCost: 1100.0,
        orgId: organizationId,
      },
    ];

    for (const stockDataItem of stockData) {
      await this.prisma.stock.upsert({
        where: {
          productId_warehouseId_orgId: {
            productId: stockDataItem.productId,
            warehouseId: stockDataItem.warehouseId,
            orgId: stockDataItem.orgId,
          },
        },
        update: {},
        create: stockDataItem,
      });
    }
  }

  private async createSampleMovements(
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
