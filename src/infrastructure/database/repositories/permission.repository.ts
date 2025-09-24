import { Permission } from '@auth/domain/entities/permission.entity';
import { IPermissionRepository as PermissionRepositoryInterface } from '@auth/domain/repositories/permissionRepository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { IPaginationOptions, IPermissionFilters, IWhereClause } from '@shared/types/filters.types';

@Injectable()
export class PermissionRepository implements PermissionRepositoryInterface {
  private readonly logger = new Logger(PermissionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Permission | null> {
    try {
      const permissionData = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permissionData) return null;

      return Permission.reconstitute(
        {
          name: permissionData.name,
          description: permissionData.description || undefined,
          module: permissionData.module,
          action: permissionData.action,
        },
        permissionData.id,
        'system' // Los permisos son globales
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permission by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding permission by ID: ${error}`);
      }
      throw error;
    }
  }

  async findByName(name: string): Promise<Permission | null> {
    try {
      const permissionData = await this.prisma.permission.findUnique({
        where: { name },
      });

      if (!permissionData) return null;

      return Permission.reconstitute(
        {
          name: permissionData.name,
          description: permissionData.description || undefined,
          module: permissionData.module,
          action: permissionData.action,
        },
        permissionData.id,
        'system'
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permission by name: ${error.message}`);
      } else {
        this.logger.error(`Error finding permission by name: ${error}`);
      }
      throw error;
    }
  }

  async findByModule(module: string): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        where: { module },
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by module: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by module: ${error}`);
      }
      throw error;
    }
  }

  async findByAction(action: string): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        where: { action },
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by action: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by action: ${error}`);
      }
      throw error;
    }
  }

  async findByModuleAndAction(module: string, action: string): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        where: { module, action },
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by module and action: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by module and action: ${error}`);
      }
      throw error;
    }
  }

  async findPermissionsByRole(roleId: string): Promise<Permission[]> {
    try {
      const rolePermissionsData = await this.prisma.rolePermission.findMany({
        where: { roleId },
        include: {
          permission: true,
        },
      });

      return rolePermissionsData.map(rolePermissionData =>
        Permission.reconstitute(
          {
            name: rolePermissionData.permission.name,
            description: rolePermissionData.permission.description || undefined,
            module: rolePermissionData.permission.module,
            action: rolePermissionData.permission.action,
          },
          rolePermissionData.permission.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by role: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by role: ${error}`);
      }
      throw error;
    }
  }

  async findPermissionsByUser(userId: string, orgId: string): Promise<Permission[]> {
    try {
      const userPermissionsData = await this.prisma.userRole.findMany({
        where: { userId, orgId },
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
      });

      const permissions = new Map<string, Permission>();

      userPermissionsData.forEach(userRoleData => {
        userRoleData.role.permissions.forEach(rolePermissionData => {
          const permission = Permission.reconstitute(
            {
              name: rolePermissionData.permission.name,
              description: rolePermissionData.permission.description || undefined,
              module: rolePermissionData.permission.module,
              action: rolePermissionData.permission.action,
            },
            rolePermissionData.permission.id,
            'system'
          );
          permissions.set(permission.id, permission);
        });
      });

      return Array.from(permissions.values());
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by user: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by user: ${error}`);
      }
      throw error;
    }
  }

  async findSystemPermissions(): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding system permissions: ${error.message}`);
      } else {
        this.logger.error(`Error finding system permissions: ${error}`);
      }
      throw error;
    }
  }

  async findCustomPermissions(_orgId: string): Promise<Permission[]> {
    // Los permisos son globales, no por organización
    return this.findSystemPermissions();
  }

  async existsByName(name: string): Promise<boolean> {
    try {
      const count = await this.prisma.permission.count({
        where: { name },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking permission existence by name: ${error.message}`);
      } else {
        this.logger.error(`Error checking permission existence by name: ${error}`);
      }
      throw error;
    }
  }

  async countByModule(module: string): Promise<number> {
    try {
      return await this.prisma.permission.count({
        where: { module },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error counting permissions by module: ${error.message}`);
      } else {
        this.logger.error(`Error counting permissions by module: ${error}`);
      }
      throw error;
    }
  }

  async findPermissionsByModules(modules: string[]): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        where: { module: { in: modules } },
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions by modules: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions by modules: ${error}`);
      }
      throw error;
    }
  }

  async findMany(
    filters: IPermissionFilters,
    pagination: IPaginationOptions
  ): Promise<Permission[]> {
    try {
      const { limit, offset } = pagination;
      const { module, action, search } = filters;

      const where: IWhereClause = {};
      if (module) where.module = module;
      if (action) where.action = action;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const permissionsData = await this.prisma.permission.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding permissions: ${error.message}`);
      } else {
        this.logger.error(`Error finding permissions: ${error}`);
      }
      throw error;
    }
  }

  async count(filters: IPermissionFilters): Promise<number> {
    try {
      const { module, action, search } = filters;

      const where: IWhereClause = {};
      if (module) where.module = module;
      if (action) where.action = action;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      return await this.prisma.permission.count({ where });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error counting permissions: ${error.message}`);
      } else {
        this.logger.error(`Error counting permissions: ${error}`);
      }
      throw error;
    }
  }

  async save(permission: Permission): Promise<Permission> {
    try {
      const permissionData = {
        name: permission.name,
        description: permission.description,
        module: permission.module,
        action: permission.action,
      };

      if (permission.id) {
        // Update existing permission
        const updatedPermission = await this.prisma.permission.update({
          where: { id: permission.id },
          data: permissionData,
        });
        return Permission.reconstitute(
          {
            name: updatedPermission.name,
            description: updatedPermission.description || undefined,
            module: updatedPermission.module,
            action: updatedPermission.action,
          },
          updatedPermission.id,
          'system'
        );
      } else {
        // Create new permission
        const createdPermission = await this.prisma.permission.create({
          data: permissionData,
        });
        return Permission.reconstitute(
          {
            name: createdPermission.name,
            description: createdPermission.description || undefined,
            module: createdPermission.module,
            action: createdPermission.action,
          },
          createdPermission.id,
          'system'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving permission: ${error.message}`);
      } else {
        this.logger.error(`Error saving permission: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.permission.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting permission: ${error.message}`);
      } else {
        this.logger.error(`Error deleting permission: ${error}`);
      }
      throw error;
    }
  }

  async findAll(_orgId: string): Promise<Permission[]> {
    try {
      const permissionsData = await this.prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });

      return permissionsData.map(permissionData =>
        Permission.reconstitute(
          {
            name: permissionData.name,
            description: permissionData.description || undefined,
            module: permissionData.module,
            action: permissionData.action,
          },
          permissionData.id,
          'system'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all permissions: ${error.message}`);
      } else {
        this.logger.error(`Error finding all permissions: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, _orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.permission.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking permission existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking permission existence: ${error}`);
      }
      throw error;
    }
  }
}
