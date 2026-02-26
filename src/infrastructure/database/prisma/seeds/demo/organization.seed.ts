import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IOrganization } from '@shared/types/database.types';

export class DemoOrganizationSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<IOrganization> {
    const org = await this.prisma.organization.upsert({
      where: { slug: 'nevada-demo' },
      update: {},
      create: {
        name: 'Nevada Tech Demo',
        slug: 'nevada-demo',
        domain: 'demo.nevada-tech.com',
        isActive: true,
        settings: {
          currency: 'COP',
          timezone: 'America/Bogota',
          language: 'es',
          dateFormat: 'DD/MM/YYYY',
        },
      },
    });

    return org as IOrganization;
  }
}
