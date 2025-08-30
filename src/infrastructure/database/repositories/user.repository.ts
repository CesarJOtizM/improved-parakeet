import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository as UserRepositoryInterface } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findFirst({
        where: { id, orgId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!userData) return null;

      // Convertir a entidad de dominio
      return User.reconstitute(
        {
          email: Email.create(userData.email),
          username: userData.username,
          passwordHash: Password.create(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
          lockedUntil: undefined, // TODO: Agregar campo a la base de datos
          roles: userData.userRoles.map(ur => ur.role.name),
          permissions: userData.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.name)
          ),
        },
        userData.id,
        userData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding user by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding user by ID: ${error}`);
      }
      throw error;
    }
  }

  async findByEmail(email: string, orgId: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findFirst({
        where: { email, orgId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!userData) return null;

      return User.reconstitute(
        {
          email: Email.create(userData.email),
          username: userData.username,
          passwordHash: Password.create(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
          lockedUntil: undefined, // TODO: Agregar campo a la base de datos
          roles: userData.userRoles.map(ur => ur.role.name),
          permissions: userData.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.name)
          ),
        },
        userData.id,
        userData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding user by email: ${error.message}`);
      } else {
        this.logger.error(`Error finding user by email: ${error}`);
      }
      throw error;
    }
  }

  async findByUsername(username: string, orgId: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findFirst({
        where: { username, orgId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!userData) return null;

      return User.reconstitute(
        {
          email: Email.create(userData.email),
          username: userData.username,
          passwordHash: Password.create(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
          lockedUntil: undefined, // TODO: Agregar campo a la base de datos
          roles: userData.userRoles.map(ur => ur.role.name),
          permissions: userData.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.name)
          ),
        },
        userData.id,
        userData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding user by username: ${error.message}`);
      } else {
        this.logger.error(`Error finding user by username: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<User[]> {
    try {
      const isActive = status === 'active';
      const usersData = await this.prisma.user.findMany({
        where: { isActive, orgId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return usersData.map(userData =>
        User.reconstitute(
          {
            email: Email.create(userData.email),
            username: userData.username,
            passwordHash: Password.create(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
            lockedUntil: undefined, // TODO: Agregar campo a la base de datos
            roles: userData.userRoles.map(ur => ur.role.name),
            permissions: userData.userRoles.flatMap(ur =>
              ur.role.permissions.map(rp => rp.permission.name)
            ),
          },
          userData.id,
          userData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding users by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding users by status: ${error}`);
      }
      throw error;
    }
  }

  async findByRole(roleId: string, orgId: string): Promise<User[]> {
    try {
      const usersData = await this.prisma.user.findMany({
        where: {
          orgId,
          userRoles: {
            some: {
              roleId,
              orgId,
            },
          },
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return usersData.map(userData =>
        User.reconstitute(
          {
            email: Email.create(userData.email),
            username: userData.username,
            passwordHash: Password.create(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
            lockedUntil: undefined, // TODO: Agregar campo a la base de datos
            roles: userData.userRoles.map(ur => ur.role.name),
            permissions: userData.userRoles.flatMap(ur =>
              ur.role.permissions.map(rp => rp.permission.name)
            ),
          },
          userData.id,
          userData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding users by role: ${error.message}`);
      } else {
        this.logger.error(`Error finding users by role: ${error}`);
      }
      throw error;
    }
  }

  async findActiveUsers(orgId: string): Promise<User[]> {
    return this.findByStatus('active', orgId);
  }

  async findLockedUsers(orgId: string): Promise<User[]> {
    return this.findByStatus('locked', orgId);
  }

  async existsByEmail(email: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { email, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking email existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking email existence: ${error}`);
      }
      throw error;
    }
  }

  async existsByUsername(username: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { username, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking username existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking username existence: ${error}`);
      }
      throw error;
    }
  }

  async countByStatus(status: string, orgId: string): Promise<number> {
    try {
      const isActive = status === 'active';
      return await this.prisma.user.count({
        where: { isActive, orgId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error counting users by status: ${error.message}`);
      } else {
        this.logger.error(`Error counting users by status: ${error}`);
      }
      throw error;
    }
  }

  async findUsersWithFailedLogins(orgId: string, _minFailedAttempts: number): Promise<User[]> {
    // Implementar lógica para usuarios con múltiples intentos fallidos
    // Por ahora retornamos usuarios activos
    return this.findActiveUsers(orgId);
  }

  async findAll(orgId: string): Promise<User[]> {
    try {
      const usersData = await this.prisma.user.findMany({
        where: { orgId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return usersData.map(userData =>
        User.reconstitute(
          {
            email: Email.create(userData.email),
            username: userData.username,
            passwordHash: Password.create(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: 0, // TODO: Agregar campo a la base de datos
            lockedUntil: undefined, // TODO: Agregar campo a la base de datos
            roles: userData.userRoles.map(ur => ur.role.name),
            permissions: userData.userRoles.flatMap(ur =>
              ur.role.permissions.map(rp => rp.permission.name)
            ),
          },
          userData.id,
          userData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all users: ${error.message}`);
      } else {
        this.logger.error(`Error finding all users: ${error}`);
      }
      throw error;
    }
  }

  async save(user: User): Promise<User> {
    try {
      // Usar firstName y lastName directamente de la entidad

      const userData = {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isActive: user.status.getValue() === 'ACTIVE',
        lastLoginAt: user.lastLoginAt,
        orgId: user.orgId,
      };

      if (user.id) {
        // Update existing user
        const updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: userData,
        });

        return User.reconstitute(
          {
            email: Email.create(updatedUser.email),
            username: updatedUser.username,
            passwordHash: Password.create(updatedUser.passwordHash),
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            status: UserStatus.create(updatedUser.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: updatedUser.lastLoginAt || undefined,
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: user.lockedUntil,
            roles: user.roles,
            permissions: user.permissions,
          },
          updatedUser.id,
          updatedUser.orgId
        );
      } else {
        // Create new user
        const newUser = await this.prisma.user.create({
          data: userData,
        });

        return User.reconstitute(
          {
            email: Email.create(newUser.email),
            username: newUser.username,
            passwordHash: Password.create(newUser.passwordHash),
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            status: UserStatus.create(newUser.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: newUser.lastLoginAt || undefined,
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: user.lockedUntil,
            roles: user.roles,
            permissions: user.permissions,
          },
          newUser.id,
          newUser.orgId
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving user: ${error.message}`);
      } else {
        this.logger.error(`Error saving user: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.user.deleteMany({
        where: { id, orgId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting user: ${error.message}`);
      } else {
        this.logger.error(`Error deleting user: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking user existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking user existence: ${error}`);
      }
      throw error;
    }
  }
}
