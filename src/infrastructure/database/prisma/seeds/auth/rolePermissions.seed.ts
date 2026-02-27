import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IPermission, IRole } from '@shared/types/database.types';

export class RolePermissionsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(roles: IRole[], permissions: IPermission[]): Promise<void> {
    // Find roles by name for better reliability
    const systemAdminRole = roles.find(r => r.name === 'SYSTEM_ADMIN');
    const adminRole = roles.find(r => r.name === 'ADMIN');
    const supervisorRole = roles.find(r => r.name === 'SUPERVISOR');
    const warehouseOperatorRole = roles.find(r => r.name === 'WAREHOUSE_OPERATOR');
    const consultantRole = roles.find(r => r.name === 'CONSULTANT');
    const importOperatorRole = roles.find(r => r.name === 'IMPORT_OPERATOR');
    const salesPersonRole = roles.find(r => r.name === 'SALES_PERSON');

    const rolePermissions = [
      // SYSTEM_ADMIN - Todos los permisos (incluyendo ORGANIZATIONS:*)
      ...(systemAdminRole
        ? permissions.map(p => ({ roleId: systemAdminRole.id, permissionId: p.id }))
        : []),

      // ADMIN - Todos los permisos excepto ORGANIZATIONS:* (solo para SYSTEM_ADMIN)
      ...(adminRole
        ? permissions
            .filter(p => !p.name.includes('ORGANIZATIONS:'))
            .map(p => ({ roleId: adminRole.id, permissionId: p.id }))
        : []),

      // SUPERVISOR - Permisos amplios (sin gestión de usuarios, roles, org ni settings)
      ...(supervisorRole
        ? permissions
            .filter(
              p =>
                !p.name.includes('USERS:') &&
                !p.name.includes('ROLES:') &&
                !p.name.includes('ORGANIZATIONS:') &&
                !p.name.includes('ORGANIZATION:UPDATE_SETTINGS') &&
                !p.name.includes('SETTINGS:')
            )
            .map(p => ({ roleId: supervisorRole.id, permissionId: p.id }))
        : []),

      // WAREHOUSE_OPERATOR - Permisos limitados
      ...(warehouseOperatorRole
        ? permissions
            .filter(
              p =>
                p.name.includes('PRODUCTS:READ') ||
                p.name.includes('WAREHOUSES:READ') ||
                p.name.includes('MOVEMENTS:') ||
                p.name.includes('INVENTORY:') ||
                p.name.includes('STOCK:') ||
                p.name.includes('REPORTS:') ||
                p.name.includes('IMPORTS:') ||
                p.name.includes('SALES:') ||
                p.name.includes('RETURNS:')
            )
            .map(p => ({ roleId: warehouseOperatorRole.id, permissionId: p.id }))
        : []),

      // CONSULTANT - Solo lectura
      ...(consultantRole
        ? permissions
            .filter(
              p =>
                p.action === 'READ' ||
                p.name.includes('EXPORT') ||
                p.name.includes('AUDIT:READ') ||
                p.name.includes('REPORTS:READ')
            )
            .map(p => ({ roleId: consultantRole.id, permissionId: p.id }))
        : []),

      // IMPORT_OPERATOR - Solo importaciones
      ...(importOperatorRole
        ? permissions
            .filter(
              p =>
                p.name.includes('IMPORTS:') ||
                p.name.includes('PRODUCTS:READ') ||
                p.name.includes('PRODUCTS:IMPORT') ||
                p.name.includes('REPORTS:READ')
            )
            .map(p => ({ roleId: importOperatorRole.id, permissionId: p.id }))
        : []),

      // SALES_PERSON - Permisos de ventas e inventario necesario
      ...(salesPersonRole
        ? permissions
            .filter(
              p =>
                p.name.includes('SALES:') ||
                p.name === 'INVENTORY:ENTRY' ||
                p.name === 'INVENTORY:READ'
            )
            .map(p => ({ roleId: salesPersonRole.id, permissionId: p.id }))
        : []),
    ];

    for (const rp of rolePermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rp.roleId,
            permissionId: rp.permissionId,
          },
        },
        update: {},
        create: rp,
      });
    }
  }
}
