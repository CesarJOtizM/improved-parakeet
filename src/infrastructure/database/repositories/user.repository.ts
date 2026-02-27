import { User } from '@auth/domain/entities/user.entity';
import { IUserRepository as UserRepositoryInterface } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { cacheEntity, getCachedEntity, invalidateEntityCache } from '@shared/infrastructure/cache';

import type { ICacheService } from '@shared/ports/cache';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
  private readonly logger = new Logger(UserRepository.name);
  // Shorter TTL for user data for security (15 minutes instead of default 30)
  private readonly userCacheTtl = 900; // 15 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CacheService')
    @Optional()
    private readonly cacheService?: ICacheService
  ) {}

  async findById(id: string, orgId: string): Promise<User | null> {
    try {
      // Try to get from cache first (with shorter TTL for security)
      if (this.cacheService) {
        const cached = await getCachedEntity<User>(this.cacheService, 'user', id, orgId);
        if (cached) {
          return cached;
        }
      }

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
      const user = User.reconstitute(
        {
          email: Email.create(userData.email),
          username: userData.username,
          passwordHash: Password.createHashed(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: userData.failedLoginAttempts ?? 0,
          lockedUntil: userData.lockedUntil || undefined,
          phone: userData.phone || undefined,
          timezone: userData.timezone || undefined,
          language: userData.language || undefined,
          jobTitle: userData.jobTitle || undefined,
          department: userData.department || undefined,
          roles: userData.userRoles.map(ur => ur.role.name),
          permissions: userData.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.name)
          ),
        },
        userData.id,
        userData.orgId
      );

      // Cache the user with shorter TTL for security
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'user', user.id, user, orgId, this.userCacheTtl);
      }

      return user;
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

      // Try cache by ID first
      if (this.cacheService) {
        const cached = await getCachedEntity<User>(this.cacheService, 'user', userData.id, orgId);
        if (cached) {
          return cached;
        }
      }

      const user = User.reconstitute(
        {
          email: Email.create(userData.email),
          username: userData.username,
          passwordHash: Password.createHashed(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: userData.failedLoginAttempts ?? 0,
          lockedUntil: userData.lockedUntil || undefined,
          phone: userData.phone || undefined,
          timezone: userData.timezone || undefined,
          language: userData.language || undefined,
          jobTitle: userData.jobTitle || undefined,
          department: userData.department || undefined,
          roles: userData.userRoles.map(ur => ur.role.name),
          permissions: userData.userRoles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.name)
          ),
        },
        userData.id,
        userData.orgId
      );

      // Cache the user with shorter TTL for security
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'user', user.id, user, orgId, this.userCacheTtl);
      }

      return user;
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
          passwordHash: Password.createHashed(userData.passwordHash),
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: userData.lastLoginAt || undefined,
          failedLoginAttempts: userData.failedLoginAttempts ?? 0,
          lockedUntil: userData.lockedUntil || undefined,
          phone: userData.phone || undefined,
          timezone: userData.timezone || undefined,
          language: userData.language || undefined,
          jobTitle: userData.jobTitle || undefined,
          department: userData.department || undefined,
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
            passwordHash: Password.createHashed(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: userData.failedLoginAttempts ?? 0,
            lockedUntil: userData.lockedUntil || undefined,
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
            passwordHash: Password.createHashed(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: userData.failedLoginAttempts ?? 0,
            lockedUntil: userData.lockedUntil || undefined,
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
            passwordHash: Password.createHashed(userData.passwordHash),
            firstName: userData.firstName,
            lastName: userData.lastName,
            status: UserStatus.create(userData.isActive ? 'ACTIVE' : 'INACTIVE'),
            lastLoginAt: userData.lastLoginAt || undefined,
            failedLoginAttempts: userData.failedLoginAttempts ?? 0,
            lockedUntil: userData.lockedUntil || undefined,
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
      this.logger.debug('Saving user', {
        userId: user.id,
        email: user.email,
        username: user.username,
        orgId: user.orgId,
        hasId: !!user.id,
      });

      // Usar firstName y lastName directamente de la entidad

      const userData = {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isActive: user.status.getValue() === 'ACTIVE',
        lastLoginAt: user.lastLoginAt,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        phone: user.phone ?? null,
        timezone: user.timezone ?? null,
        language: user.language ?? null,
        jobTitle: user.jobTitle ?? null,
        department: user.department ?? null,
        orgId: user.orgId,
      };

      this.logger.debug('User data prepared', { userData });

      if (user.id) {
        // Verificar si el usuario realmente existe en la base de datos
        const existingUser = await this.prisma.user.findUnique({
          where: { id: user.id },
        });

        if (existingUser) {
          // Update existing user
          this.logger.debug('Updating existing user', { userId: user.id });
          const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: userData,
          });

          this.logger.debug('User updated successfully', { userId: updatedUser.id });

          const savedUser = User.reconstitute(
            {
              email: Email.create(updatedUser.email),
              username: updatedUser.username,
              passwordHash: Password.createHashed(updatedUser.passwordHash),
              firstName: updatedUser.firstName,
              lastName: updatedUser.lastName,
              status: UserStatus.create(updatedUser.isActive ? 'ACTIVE' : 'INACTIVE'),
              lastLoginAt: updatedUser.lastLoginAt || undefined,
              failedLoginAttempts: updatedUser.failedLoginAttempts ?? 0,
              lockedUntil: updatedUser.lockedUntil || undefined,
              roles: user.roles,
              permissions: user.permissions,
            },
            updatedUser.id,
            updatedUser.orgId
          );

          // Invalidate and update cache
          if (this.cacheService) {
            await invalidateEntityCache(this.cacheService, 'user', savedUser.id, savedUser.orgId);
            await cacheEntity(
              this.cacheService,
              'user',
              savedUser.id,
              savedUser,
              savedUser.orgId,
              this.userCacheTtl
            );
          }

          return savedUser;
        } else {
          // El ID existe pero no está en la base de datos, crear nuevo usuario
          this.logger.debug('User ID exists but not in database, creating new user', {
            userId: user.id,
          });
        }
      }

      // Create new user (either no ID or ID doesn't exist in database)
      this.logger.debug('Creating new user');
      const newUser = await this.prisma.user.create({
        data: userData,
      });

      this.logger.debug('User created successfully', { userId: newUser.id });

      const savedUser = User.reconstitute(
        {
          email: Email.create(newUser.email),
          username: newUser.username,
          passwordHash: Password.createHashed(newUser.passwordHash),
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          status: UserStatus.create(newUser.isActive ? 'ACTIVE' : 'INACTIVE'),
          lastLoginAt: newUser.lastLoginAt || undefined,
          failedLoginAttempts: newUser.failedLoginAttempts ?? 0,
          lockedUntil: newUser.lockedUntil || undefined,
          roles: user.roles,
          permissions: user.permissions,
        },
        newUser.id,
        newUser.orgId
      );

      // Cache the new user
      if (this.cacheService) {
        await cacheEntity(
          this.cacheService,
          'user',
          savedUser.id,
          savedUser,
          savedUser.orgId,
          this.userCacheTtl
        );
      }

      return savedUser;
    } catch (error) {
      this.logger.error('Error saving user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: user.id,
        email: user.email,
        orgId: user.orgId,
      });
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.user.deleteMany({
        where: { id, orgId },
      });

      // Invalidate cache
      if (this.cacheService) {
        await invalidateEntityCache(this.cacheService, 'user', id, orgId);
      }
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
