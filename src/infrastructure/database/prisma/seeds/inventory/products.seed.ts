import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct } from '@shared/types/database.types';

export class ProductsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string): Promise<IProduct[]> {
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
}
