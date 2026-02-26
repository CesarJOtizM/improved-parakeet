import { PrismaClient } from '@infrastructure/database/generated/prisma';

interface CategoryRecord {
  id: string;
  name: string;
  orgId: string;
  parentId: string | null;
}

interface CategoryDef {
  name: string;
  description: string;
  children?: { name: string; description: string }[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: 'Electrónica',
    description: 'Dispositivos y componentes electrónicos',
    children: [
      { name: 'Computadores', description: 'Laptops, desktops y tablets' },
      { name: 'Periféricos', description: 'Teclados, mouse, webcams, headsets' },
      { name: 'Monitores', description: 'Pantallas y displays' },
      { name: 'Almacenamiento', description: 'Discos duros, SSDs, memorias USB' },
    ],
  },
  {
    name: 'Redes y Conectividad',
    description: 'Equipos de red y comunicaciones',
    children: [
      { name: 'Cables', description: 'HDMI, USB, Ethernet, fibra óptica' },
      { name: 'Routers y Switches', description: 'Equipos de red' },
      { name: 'Adaptadores', description: 'Adaptadores y dongles de conectividad' },
    ],
  },
  {
    name: 'Accesorios',
    description: 'Accesorios varios para equipos',
    children: [
      { name: 'Fundas y Estuches', description: 'Protección para dispositivos' },
      { name: 'Cargadores', description: 'Cargadores y baterías externas' },
      { name: 'Soportes', description: 'Soportes para laptops y monitores' },
    ],
  },
  {
    name: 'Impresión',
    description: 'Equipos y suministros de impresión',
    children: [
      { name: 'Impresoras', description: 'Impresoras láser e inyección' },
      { name: 'Tóner y Tintas', description: 'Consumibles de impresión' },
      { name: 'Papel', description: 'Papel para impresión' },
    ],
  },
  {
    name: 'Software y Licencias',
    description: 'Licencias de software',
  },
];

export class DemoCategoriesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string): Promise<CategoryRecord[]> {
    const allCategories: CategoryRecord[] = [];

    for (const catDef of CATEGORIES) {
      // Parent category
      const parent = await this.prisma.category.upsert({
        where: { name_orgId: { name: catDef.name, orgId } },
        update: {},
        create: {
          name: catDef.name,
          description: catDef.description,
          isActive: true,
          orgId,
        },
      });
      allCategories.push(parent as CategoryRecord);

      // Child categories
      if (catDef.children) {
        for (const child of catDef.children) {
          const childCat = await this.prisma.category.upsert({
            where: { name_orgId: { name: child.name, orgId } },
            update: {},
            create: {
              name: child.name,
              description: child.description,
              parentId: parent.id,
              isActive: true,
              orgId,
            },
          });
          allCategories.push(childCat as CategoryRecord);
        }
      }
    }

    return allCategories;
  }
}
