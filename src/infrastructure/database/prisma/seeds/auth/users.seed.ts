import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IUser } from '@shared/types/database.types';

export class UsersSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(organizationId: string, adminRoleId: string): Promise<IUser> {
    const adminUser = await this.prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
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

    return adminUser as IUser;
  }
}
