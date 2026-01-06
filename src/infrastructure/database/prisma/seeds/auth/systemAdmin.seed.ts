import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IUser } from '@shared/types/database.types';

export class SystemAdminSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(): Promise<IUser> {
    // Crear o obtener organización SYSTEM para el system admin
    const systemOrg = await this.prisma.organization.upsert({
      where: { slug: 'system' },
      update: {},
      create: {
        name: 'System',
        slug: 'system',
        domain: 'system.internal',
        isActive: true,
      },
    });

    // Obtener el rol SYSTEM_ADMIN del sistema (orgId null)
    const systemAdminRole = await this.prisma.role.findFirst({
      where: {
        name: 'SYSTEM_ADMIN',
        orgId: null,
      },
    });

    if (!systemAdminRole) {
      throw new Error('SYSTEM_ADMIN role not found. Please ensure roles seed is run first.');
    }

    // Crear usuario system admin
    const systemAdmin = await this.prisma.user.upsert({
      where: { email: 'system@admin.com' },
      update: {},
      create: {
        email: 'system@admin.com',
        username: 'system-admin',
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash: '$2b$12$pEquH59Tvv3q4r5Ko48yD.aXEKoo5q.zonfns67mKd8kcDWM7Z3ly', // password: admin123
        isActive: true,
        orgId: systemOrg.id,
      },
    });

    // Asignar rol SYSTEM_ADMIN al system admin
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId_orgId: {
          userId: systemAdmin.id,
          roleId: systemAdminRole.id,
          orgId: systemOrg.id,
        },
      },
      update: {},
      create: {
        userId: systemAdmin.id,
        roleId: systemAdminRole.id,
        orgId: systemOrg.id,
      },
    });

    return systemAdmin as IUser;
  }
}
