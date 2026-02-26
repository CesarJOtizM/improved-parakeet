import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { IUser } from '@shared/types/database.types';

// bcrypt hash for "demo1234"
const DEMO_PASSWORD_HASH = '$2b$12$7uXtQhxjUIKJmqgwexPCxeRqytbhrRfwMN2V3LreerUJGBWQuDEDy';

interface DemoUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roleName: string;
  isActive: boolean;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@nevada-demo.com',
    username: 'admin-demo',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    roleName: 'ADMIN',
    isActive: true,
  },
  {
    email: 'supervisor@nevada-demo.com',
    username: 'supervisor-demo',
    firstName: 'María',
    lastName: 'García',
    roleName: 'SUPERVISOR',
    isActive: true,
  },
  {
    email: 'operador@nevada-demo.com',
    username: 'operador-demo',
    firstName: 'Juan',
    lastName: 'Martínez',
    roleName: 'WAREHOUSE_OPERATOR',
    isActive: true,
  },
  {
    email: 'vendedor@nevada-demo.com',
    username: 'vendedor-demo',
    firstName: 'Ana',
    lastName: 'López',
    roleName: 'SALES_PERSON',
    isActive: true,
  },
  {
    email: 'consultor@nevada-demo.com',
    username: 'consultor-demo',
    firstName: 'Pedro',
    lastName: 'Sánchez',
    roleName: 'CONSULTANT',
    isActive: true,
  },
  {
    email: 'importador@nevada-demo.com',
    username: 'importador-demo',
    firstName: 'Laura',
    lastName: 'Hernández',
    roleName: 'IMPORT_OPERATOR',
    isActive: true,
  },
  {
    email: 'inactivo@nevada-demo.com',
    username: 'inactivo-demo',
    firstName: 'Roberto',
    lastName: 'Díaz',
    roleName: 'WAREHOUSE_OPERATOR',
    isActive: false,
  },
];

export class DemoUsersSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string): Promise<IUser[]> {
    const users: IUser[] = [];

    for (const userData of DEMO_USERS) {
      const user = await this.prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash: DEMO_PASSWORD_HASH,
          isActive: userData.isActive,
          orgId,
        },
      });

      // Find the system role
      const role = await this.prisma.role.findFirst({
        where: { name: userData.roleName, isSystem: true },
      });

      if (role) {
        await this.prisma.userRole.upsert({
          where: {
            userId_roleId_orgId: {
              userId: user.id,
              roleId: role.id,
              orgId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: role.id,
            orgId,
          },
        });
      }

      users.push(user as IUser);
    }

    return users;
  }
}
