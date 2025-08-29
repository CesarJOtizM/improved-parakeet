/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { Permission, Role, SeedResult, User } from '@shared/types/database.types';

export class AuthSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string): Promise<SeedResult> {
    console.log('🌱 Sembrando dominio de autenticación...');

    // Crear roles predefinidos
    const roles = await this.createRoles(organizationId);
    console.log(
      '✅ Roles creados:',
      roles.map(r => r.name)
    );

    // Crear permisos del sistema
    const permissions = await this.createPermissions();
    console.log('✅ Permisos creados:', permissions.length);

    // Asignar permisos a roles
    await this.assignPermissionsToRoles(roles, permissions);
    console.log('✅ Permisos asignados a roles');

    // Crear usuario administrador
    const adminUser = await this.createAdminUser(organizationId, roles[0].id);
    console.log('✅ Usuario administrador creado:', adminUser.email);

    return { roles, permissions, adminUser };
  }

  private async createRoles(organizationId: string): Promise<Role[]> {
    const rolesData = [
      {
        name: 'ADMIN',
        description: 'Administrador del sistema con acceso total',
        isActive: true,
        orgId: organizationId,
      },
      {
        name: 'SUPERVISOR',
        description: 'Supervisor de bodegas con acceso amplio',
        isActive: true,
        orgId: organizationId,
      },
      {
        name: 'WAREHOUSE_OPERATOR',
        description: 'Operador de bodega con acceso limitado',
        isActive: true,
        orgId: organizationId,
      },
      {
        name: 'CONSULTANT',
        description: 'Consultor con acceso de solo lectura',
        isActive: true,
        orgId: organizationId,
      },
      {
        name: 'IMPORT_OPERATOR',
        description: 'Operador de importaciones masivas',
        isActive: true,
        orgId: organizationId,
      },
    ];

    const roles = [];
    for (const roleData of rolesData) {
      const role = await this.prisma.role.upsert({
        where: { name_orgId: { name: roleData.name, orgId: roleData.orgId } },
        update: {},
        create: roleData,
      });
      roles.push(role);
    }

    return roles as Role[];
  }

  private async createPermissions(): Promise<Permission[]> {
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
        name: 'USERS:ASSIGN_ROLES',
        description: 'Asignar roles',
        module: 'USERS',
        action: 'ASSIGN_ROLES',
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
        name: 'PRODUCTS:IMPORT_MASSIVE',
        description: 'Importar productos masivamente',
        module: 'PRODUCTS',
        action: 'IMPORT_MASSIVE',
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

      // Movimientos
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

      // Stock
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
        name: 'REPORTS:VIEW_INVENTORY',
        description: 'Ver reportes de inventario',
        module: 'REPORTS',
        action: 'VIEW_INVENTORY',
      },
      {
        name: 'REPORTS:VIEW_MOVEMENTS',
        description: 'Ver reportes de movimientos',
        module: 'REPORTS',
        action: 'VIEW_MOVEMENTS',
      },
      {
        name: 'REPORTS:EXPORT_PDF',
        description: 'Exportar a PDF',
        module: 'REPORTS',
        action: 'EXPORT_PDF',
      },
      {
        name: 'REPORTS:EXPORT_EXCEL',
        description: 'Exportar a Excel',
        module: 'REPORTS',
        action: 'EXPORT_EXCEL',
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

      // Organización
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

    return permissions as Permission[];
  }

  private async assignPermissionsToRoles(roles: Role[], permissions: Permission[]): Promise<void> {
    const rolePermissions = [
      // ADMIN - Todos los permisos
      ...(roles[0].name === 'ADMIN'
        ? permissions.map(p => ({ roleId: roles[0].id, permissionId: p.id }))
        : []),

      // SUPERVISOR - Permisos amplios
      ...(roles[1].name === 'SUPERVISOR'
        ? permissions
            .filter(
              p =>
                !p.name.includes('USERS:') &&
                !p.name.includes('ROLES:') &&
                !p.name.includes('ORGANIZATION:UPDATE_SETTINGS')
            )
            .map(p => ({ roleId: roles[1].id, permissionId: p.id }))
        : []),

      // WAREHOUSE_OPERATOR - Permisos limitados
      ...(roles[2].name === 'WAREHOUSE_OPERATOR'
        ? permissions
            .filter(
              p =>
                p.name.includes('PRODUCTS:READ') ||
                p.name.includes('WAREHOUSES:READ') ||
                p.name.includes('MOVEMENTS:') ||
                p.name.includes('STOCK:') ||
                p.name.includes('REPORTS:') ||
                p.name.includes('IMPORTS:')
            )
            .map(p => ({ roleId: roles[2].id, permissionId: p.id }))
        : []),

      // CONSULTANT - Solo lectura
      ...(roles[3].name === 'CONSULTANT'
        ? permissions
            .filter(p => p.action === 'READ' || p.name.includes('EXPORT'))
            .map(p => ({ roleId: roles[3].id, permissionId: p.id }))
        : []),

      // IMPORT_OPERATOR - Solo importaciones
      ...(roles[4].name === 'IMPORT_OPERATOR'
        ? permissions
            .filter(
              p =>
                p.name.includes('IMPORTS:') ||
                p.name.includes('PRODUCTS:READ') ||
                p.name.includes('REPORTS:VIEW_INVENTORY')
            )
            .map(p => ({ roleId: roles[4].id, permissionId: p.id }))
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

  private async createAdminUser(organizationId: string, adminRoleId: string): Promise<User> {
    const adminUser = await this.prisma.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: {
        email: 'admin@demo.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'Demo',
        passwordHash: '$2b$12$pEquH59Tvv3q4r5Ko48yD.aXEKoo5q.zonfns67mKd8kcDWM7Z3ly', // password: admin123
        isActive: true,
        orgId: organizationId,
      },
    });

    // Asignar rol de administrador
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId_orgId: {
          userId: adminUser.id,
          roleId: adminRoleId,
          orgId: organizationId,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
        orgId: organizationId,
      },
    });

    return adminUser as User;
  }
}
