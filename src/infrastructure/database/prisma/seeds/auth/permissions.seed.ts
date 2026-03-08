import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IPermission } from '@shared/types/database.types';

export class PermissionsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<IPermission[]> {
    const permissionsData = [
      // Usuarios
      { name: 'USERS:CREATE', description: 'Crear usuarios', module: 'USERS', action: 'CREATE' },
      { name: 'USERS:READ', description: 'Ver usuarios', module: 'USERS', action: 'READ' },
      {
        name: 'USERS:UPDATE',
        description: 'Actualizar usuarios',
        module: 'USERS',
        action: 'UPDATE',
      },
      { name: 'USERS:DELETE', description: 'Eliminar usuarios', module: 'USERS', action: 'DELETE' },
      {
        name: 'USERS:MANAGE_ROLES',
        description: 'Gestionar roles de usuarios',
        module: 'USERS',
        action: 'MANAGE_ROLES',
      },

      // Roles
      { name: 'ROLES:CREATE', description: 'Crear roles', module: 'ROLES', action: 'CREATE' },
      { name: 'ROLES:READ', description: 'Ver roles', module: 'ROLES', action: 'READ' },
      { name: 'ROLES:UPDATE', description: 'Actualizar roles', module: 'ROLES', action: 'UPDATE' },
      { name: 'ROLES:DELETE', description: 'Eliminar roles', module: 'ROLES', action: 'DELETE' },

      // Productos
      {
        name: 'PRODUCTS:CREATE',
        description: 'Crear productos',
        module: 'PRODUCTS',
        action: 'CREATE',
      },
      { name: 'PRODUCTS:READ', description: 'Ver productos', module: 'PRODUCTS', action: 'READ' },
      {
        name: 'PRODUCTS:UPDATE',
        description: 'Actualizar productos',
        module: 'PRODUCTS',
        action: 'UPDATE',
      },
      {
        name: 'PRODUCTS:DELETE',
        description: 'Eliminar productos',
        module: 'PRODUCTS',
        action: 'DELETE',
      },
      {
        name: 'PRODUCTS:IMPORT',
        description: 'Importar productos',
        module: 'PRODUCTS',
        action: 'IMPORT',
      },

      // Bodegas
      {
        name: 'WAREHOUSES:CREATE',
        description: 'Crear bodegas',
        module: 'WAREHOUSES',
        action: 'CREATE',
      },
      { name: 'WAREHOUSES:READ', description: 'Ver bodegas', module: 'WAREHOUSES', action: 'READ' },
      {
        name: 'WAREHOUSES:UPDATE',
        description: 'Actualizar bodegas',
        module: 'WAREHOUSES',
        action: 'UPDATE',
      },
      {
        name: 'WAREHOUSES:DELETE',
        description: 'Eliminar bodegas',
        module: 'WAREHOUSES',
        action: 'DELETE',
      },

      // Inventario (permisos principales usados en el código)
      {
        name: 'INVENTORY:READ',
        description: 'Ver inventario',
        module: 'INVENTORY',
        action: 'READ',
      },
      {
        name: 'INVENTORY:ENTRY',
        description: 'Crear entradas de inventario',
        module: 'INVENTORY',
        action: 'ENTRY',
      },
      {
        name: 'INVENTORY:EXIT',
        description: 'Crear salidas de inventario',
        module: 'INVENTORY',
        action: 'EXIT',
      },
      {
        name: 'INVENTORY:TRANSFER',
        description: 'Transferir inventario entre bodegas',
        module: 'INVENTORY',
        action: 'TRANSFER',
      },
      {
        name: 'INVENTORY:ADJUST',
        description: 'Ajustar inventario',
        module: 'INVENTORY',
        action: 'ADJUST',
      },

      // Movimientos (mantener para compatibilidad)
      {
        name: 'MOVEMENTS:CREATE',
        description: 'Crear movimientos',
        module: 'MOVEMENTS',
        action: 'CREATE',
      },
      {
        name: 'MOVEMENTS:READ',
        description: 'Ver movimientos',
        module: 'MOVEMENTS',
        action: 'READ',
      },
      {
        name: 'MOVEMENTS:UPDATE',
        description: 'Actualizar movimientos',
        module: 'MOVEMENTS',
        action: 'UPDATE',
      },
      {
        name: 'MOVEMENTS:POST',
        description: 'Confirmar movimientos',
        module: 'MOVEMENTS',
        action: 'POST',
      },
      {
        name: 'MOVEMENTS:VOID',
        description: 'Anular movimientos',
        module: 'MOVEMENTS',
        action: 'VOID',
      },

      // Stock (mantener para compatibilidad)
      {
        name: 'STOCK:VIEW_BALANCE',
        description: 'Ver saldos de inventario',
        module: 'STOCK',
        action: 'VIEW_BALANCE',
      },
      {
        name: 'STOCK:VIEW_LOW_STOCK',
        description: 'Ver alertas de stock bajo',
        module: 'STOCK',
        action: 'VIEW_LOW_STOCK',
      },
      {
        name: 'STOCK:ADJUST_STOCK',
        description: 'Ajustar stock',
        module: 'STOCK',
        action: 'ADJUST_STOCK',
      },

      // Reportes
      {
        name: 'REPORTS:READ',
        description: 'Ver reportes',
        module: 'REPORTS',
        action: 'READ',
      },
      {
        name: 'REPORTS:READ_SENSITIVE',
        description: 'Ver reportes sensibles',
        module: 'REPORTS',
        action: 'READ_SENSITIVE',
      },
      {
        name: 'REPORTS:EXPORT',
        description: 'Exportar reportes',
        module: 'REPORTS',
        action: 'EXPORT',
      },

      // Importaciones
      {
        name: 'IMPORTS:CREATE_PRODUCTS',
        description: 'Crear importaciones de productos',
        module: 'IMPORTS',
        action: 'CREATE_PRODUCTS',
      },
      {
        name: 'IMPORTS:VALIDATE',
        description: 'Validar importaciones',
        module: 'IMPORTS',
        action: 'VALIDATE',
      },
      {
        name: 'IMPORTS:APPLY',
        description: 'Aplicar importaciones',
        module: 'IMPORTS',
        action: 'APPLY',
      },

      // Organizaciones (solo para SYSTEM_ADMIN)
      {
        name: 'ORGANIZATIONS:CREATE',
        description: 'Crear organizaciones',
        module: 'ORGANIZATIONS',
        action: 'CREATE',
      },
      {
        name: 'ORGANIZATIONS:READ',
        description: 'Ver organizaciones',
        module: 'ORGANIZATIONS',
        action: 'READ',
      },
      {
        name: 'ORGANIZATIONS:UPDATE',
        description: 'Actualizar organizaciones',
        module: 'ORGANIZATIONS',
        action: 'UPDATE',
      },
      {
        name: 'ORGANIZATIONS:DELETE',
        description: 'Eliminar organizaciones',
        module: 'ORGANIZATIONS',
        action: 'DELETE',
      },

      // Organización (configuración dentro de una organización)
      {
        name: 'ORGANIZATION:VIEW_SETTINGS',
        description: 'Ver configuración',
        module: 'ORGANIZATION',
        action: 'VIEW_SETTINGS',
      },
      {
        name: 'ORGANIZATION:UPDATE_SETTINGS',
        description: 'Actualizar configuración',
        module: 'ORGANIZATION',
        action: 'UPDATE_SETTINGS',
      },
      {
        name: 'ORGANIZATION:MANAGE_BRANDING',
        description: 'Gestionar branding',
        module: 'ORGANIZATION',
        action: 'MANAGE_BRANDING',
      },

      // Ventas
      {
        name: 'SALES:CREATE',
        description: 'Create sales',
        module: 'SALES',
        action: 'CREATE',
      },
      {
        name: 'SALES:READ',
        description: 'View sales',
        module: 'SALES',
        action: 'READ',
      },
      {
        name: 'SALES:UPDATE',
        description: 'Update sales',
        module: 'SALES',
        action: 'UPDATE',
      },
      {
        name: 'SALES:DELETE',
        description: 'Delete sales',
        module: 'SALES',
        action: 'DELETE',
      },
      {
        name: 'SALES:CONFIRM',
        description: 'Confirm sales',
        module: 'SALES',
        action: 'CONFIRM',
      },
      {
        name: 'SALES:CANCEL',
        description: 'Cancel sales',
        module: 'SALES',
        action: 'CANCEL',
      },
      {
        name: 'SALES:PICK',
        description: 'Pick sales orders',
        module: 'SALES',
        action: 'PICK',
      },
      {
        name: 'SALES:SHIP',
        description: 'Ship sales orders',
        module: 'SALES',
        action: 'SHIP',
      },
      {
        name: 'SALES:COMPLETE',
        description: 'Complete sales orders',
        module: 'SALES',
        action: 'COMPLETE',
      },
      {
        name: 'SALES:RETURN',
        description: 'Process sales returns',
        module: 'SALES',
        action: 'RETURN',
      },
      {
        name: 'SALES:SWAP',
        description: 'Swap products in confirmed or picking sales',
        module: 'SALES',
        action: 'SWAP',
      },

      // Devoluciones
      {
        name: 'RETURNS:CREATE',
        description: 'Create returns',
        module: 'RETURNS',
        action: 'CREATE',
      },
      {
        name: 'RETURNS:READ',
        description: 'View returns',
        module: 'RETURNS',
        action: 'READ',
      },
      {
        name: 'RETURNS:UPDATE',
        description: 'Update returns',
        module: 'RETURNS',
        action: 'UPDATE',
      },
      {
        name: 'RETURNS:DELETE',
        description: 'Delete returns',
        module: 'RETURNS',
        action: 'DELETE',
      },
      {
        name: 'RETURNS:CONFIRM',
        description: 'Confirm returns',
        module: 'RETURNS',
        action: 'CONFIRM',
      },
      {
        name: 'RETURNS:CANCEL',
        description: 'Cancel returns',
        module: 'RETURNS',
        action: 'CANCEL',
      },

      // Auditoría
      {
        name: 'AUDIT:READ',
        description: 'Ver logs de auditoría',
        module: 'AUDIT',
        action: 'READ',
      },
      {
        name: 'AUDIT:EXPORT',
        description: 'Exportar logs de auditoría',
        module: 'AUDIT',
        action: 'EXPORT',
      },

      // Contactos
      {
        name: 'CONTACTS:CREATE',
        description: 'Crear contactos',
        module: 'CONTACTS',
        action: 'CREATE',
      },
      {
        name: 'CONTACTS:READ',
        description: 'Ver contactos',
        module: 'CONTACTS',
        action: 'READ',
      },
      {
        name: 'CONTACTS:UPDATE',
        description: 'Actualizar contactos',
        module: 'CONTACTS',
        action: 'UPDATE',
      },
      {
        name: 'CONTACTS:DELETE',
        description: 'Eliminar contactos',
        module: 'CONTACTS',
        action: 'DELETE',
      },

      // Configuración
      {
        name: 'SETTINGS:MANAGE',
        description: 'Gestionar configuración del sistema (alertas, notificaciones)',
        module: 'SETTINGS',
        action: 'MANAGE',
      },
    ];

    const permissions = [];
    for (const permData of permissionsData) {
      const permission = await this.prisma.permission.upsert({
        where: { name: permData.name },
        update: {},
        create: permData,
      });
      permissions.push(permission);
    }

    return permissions as IPermission[];
  }
}
