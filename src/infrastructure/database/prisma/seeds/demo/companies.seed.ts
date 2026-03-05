import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IProduct } from '@shared/types/database.types';

interface CompanyDef {
  name: string;
  code: string;
  description: string;
  skuPrefixes: string[];
}

const COMPANIES: CompanyDef[] = [
  {
    name: 'Hardware & Equipos',
    code: 'HARDWARE',
    description: 'Division de computadores, monitores y almacenamiento',
    skuPrefixes: ['LAP-', 'DT-', 'TAB-', 'MON-', 'SSD-', 'HDD-', 'USB-SAN', 'MICROSD', 'DISC-'],
  },
  {
    name: 'Redes & Perifericos',
    code: 'REDES',
    description: 'Division de redes, conectividad y perifericos',
    skuPrefixes: [
      'MOUSE-',
      'KB-',
      'WEBCAM',
      'HEADSET-',
      'PARLANTE',
      'CABLE-',
      'RTR-',
      'SW-',
      'AP-',
      'HUB-',
      'DOCK-',
    ],
  },
  {
    name: 'Suministros & Oficina',
    code: 'OFICINA',
    description: 'Division de impresion, software y accesorios de oficina',
    skuPrefixes: [
      'IMP-',
      'TONER-',
      'TINTA-',
      'PAPEL-',
      'LIC-',
      'FUNDA-',
      'CHRG-',
      'PBANK',
      'SOPORTE-',
      'BRAZO-',
    ],
  },
];

export class DemoCompaniesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string, products: IProduct[]): Promise<number> {
    let assigned = 0;

    for (const companyDef of COMPANIES) {
      const company = await this.prisma.company.upsert({
        where: { code_orgId: { code: companyDef.code, orgId } },
        update: {},
        create: {
          name: companyDef.name,
          code: companyDef.code,
          description: companyDef.description,
          isActive: true,
          orgId,
        },
      });

      // Assign products to this company by SKU prefix
      const companyProducts = products.filter(p =>
        companyDef.skuPrefixes.some(prefix => p.sku.startsWith(prefix))
      );

      for (const prod of companyProducts) {
        await this.prisma.product.update({
          where: { id: prod.id },
          data: { companyId: company.id },
        });
        assigned++;
      }
    }

    return assigned;
  }
}
