/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { ISeedResult } from '@shared/types/database.types';

import { PermissionsSeed } from './permissions.seed';
import { RolePermissionsSeed } from './rolePermissions.seed';
import { RolesSeed } from './roles.seed';

export class AuthSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<ISeedResult> {
    console.log('🌱 Sembrando dominio de autenticación...');

    // Crear roles predefinidos (una sola vez, sin orgId)
    const rolesSeed = new RolesSeed(this.prisma);
    const roles = await rolesSeed.seed();
    console.log(
      '✅ Roles predefinidos creados:',
      roles.map(r => r.name)
    );

    // Crear permisos del sistema
    const permissionsSeed = new PermissionsSeed(this.prisma);
    const permissions = await permissionsSeed.seed();
    console.log('✅ Permisos creados:', permissions.length);

    // Asignar permisos a roles predefinidos
    const rolePermissionsSeed = new RolePermissionsSeed(this.prisma);
    await rolePermissionsSeed.seed(roles, permissions);
    console.log('✅ Permisos asignados a roles');

    // No creamos usuario aquí, se crea el system admin en el seed principal
    return { roles, permissions };
  }
}
