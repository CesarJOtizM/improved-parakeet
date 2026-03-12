import { Prisma, PrismaClient } from '@infrastructure/database/generated/prisma';
import { IOrganization } from '@shared/types/database.types';

interface OrgConfig {
  name: string;
  slug: string;
  domain: string;
  settings: Prisma.InputJsonValue;
}

const FULL_ORG: OrgConfig = {
  name: 'Nevada Tech Demo',
  slug: 'nevada-demo',
  domain: 'demo.nevada-tech.com',
  settings: {
    currency: 'COP',
    timezone: 'America/Bogota',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    pickingEnabled: true,
    multiCompanyEnabled: true,
    integrationsEnabled: true,
  },
};

const SIMPLE_ORG: OrgConfig = {
  name: 'Distribuidora Lopez SAS',
  slug: 'distri-lopez',
  domain: 'distri-lopez.nevada-tech.com',
  settings: {
    currency: 'COP',
    timezone: 'America/Bogota',
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
  },
};

export class DemoOrganizationSeed {
  constructor(private prisma: PrismaClient) {}

  async seedFullOrg(): Promise<IOrganization> {
    return this.createOrg(FULL_ORG);
  }

  async seedSimpleOrg(): Promise<IOrganization> {
    return this.createOrg(SIMPLE_ORG);
  }

  /** @deprecated Use seedFullOrg() instead */
  async seed(): Promise<IOrganization> {
    return this.seedFullOrg();
  }

  private async createOrg(config: OrgConfig): Promise<IOrganization> {
    const org = await this.prisma.organization.upsert({
      where: { slug: config.slug },
      update: { settings: config.settings },
      create: {
        name: config.name,
        slug: config.slug,
        domain: config.domain,
        isActive: true,
        settings: config.settings,
      },
    });

    return org as IOrganization;
  }
}
