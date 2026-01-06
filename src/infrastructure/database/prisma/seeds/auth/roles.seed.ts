import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IRole } from '@shared/types/database.types';

export class RolesSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<IRole[]> {
    const rolesData = [
      {
        name: 'SYSTEM_ADMIN',
        description: 'Administrador del sistema con acceso total a todas las organizaciones',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'ADMIN',
        description: 'Administrador de organización con acceso total dentro de su organización',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'SUPERVISOR',
        description: 'Supervisor de bodegas con acceso amplio',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'WAREHOUSE_OPERATOR',
        description: 'Operador de bodega con acceso limitado',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'CONSULTANT',
        description: 'Consultor con acceso de solo lectura',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'IMPORT_OPERATOR',
        description: 'Operador de importaciones masivas',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
      {
        name: 'SALES_PERSON',
        description: 'Vendedor con acceso solo a ventas',
        isActive: true,
        isSystem: true,
        orgId: null,
      },
    ];

    const roles = [];
    for (const roleData of rolesData) {
      // For system roles (orgId is null), use findFirst instead of upsert with unique constraint
      let role;
      if (roleData.orgId === null) {
        role = await this.prisma.role.findFirst({
          where: {
            name: roleData.name,
            orgId: null,
          },
        });

        if (!role) {
          role = await this.prisma.role.create({
            data: {
              name: roleData.name,
              description: roleData.description,
              isActive: roleData.isActive,
              isSystem: roleData.isSystem,
              orgId: null,
            },
          });
        }
      } else {
        role = await this.prisma.role.upsert({
          where: {
            name_orgId: {
              name: roleData.name,
              orgId: roleData.orgId,
            },
          },
          update: {},
          create: {
            name: roleData.name,
            description: roleData.description,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
            orgId: roleData.orgId,
          },
        });
      }
      roles.push(role);
    }

    return roles as IRole[];
  }
}
