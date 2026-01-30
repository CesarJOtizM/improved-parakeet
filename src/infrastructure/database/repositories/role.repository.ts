import { Role } from '@auth/domain/entities/role.entity';
import { IRoleRepository } from '@auth/domain/repositories/roleRepository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RoleRepository implements IRoleRepository {
  private readonly logger = new Logger(RoleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId?: string): Promise<Role | null> {
    try {
      const whereClause: { id: string; orgId?: string | null } = { id };
      if (orgId !== undefined) {
        whereClause.orgId = orgId;
      }

      const roleData = await this.prisma.role.findFirst({
        where: whereClause,
      });

      if (!roleData) return null;

      return Role.reconstitute(
        {
          name: roleData.name,
          description: roleData.description || undefined,
          isActive: roleData.isActive,
          isSystem: roleData.isSystem,
        },
        roleData.id,
        roleData.orgId || undefined
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding role by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding role by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Role[]> {
    // Return available roles for organization (system + custom)
    return this.findAvailableRolesForOrganization(orgId);
  }

  async findByName(name: string, orgId?: string): Promise<Role | null> {
    try {
      const whereClause: { name: string; orgId?: string | null } = { name };
      if (orgId !== undefined) {
        whereClause.orgId = orgId;
      } else {
        // If orgId is not provided, search for system role first
        whereClause.orgId = null;
      }

      const roleData = await this.prisma.role.findFirst({
        where: whereClause,
      });

      if (!roleData) return null;

      return Role.reconstitute(
        {
          name: roleData.name,
          description: roleData.description || undefined,
          isActive: roleData.isActive,
          isSystem: roleData.isSystem,
        },
        roleData.id,
        roleData.orgId || undefined
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding role by name: ${error.message}`);
      } else {
        this.logger.error(`Error finding role by name: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(isActive: boolean, orgId: string): Promise<Role[]> {
    try {
      const rolesData = await this.prisma.role.findMany({
        where: { isActive, orgId },
        orderBy: { name: 'asc' },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
          },
          roleData.id,
          roleData.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding roles by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding roles by status: ${error}`);
      }
      throw error;
    }
  }

  async findActiveRoles(orgId: string): Promise<Role[]> {
    return this.findByStatus(true, orgId);
  }

  async findRolesByUser(userId: string, orgId: string): Promise<Role[]> {
    try {
      const userRolesData = await this.prisma.userRole.findMany({
        where: { userId, orgId },
        include: { role: true },
      });

      return userRolesData.map(ur =>
        Role.reconstitute(
          {
            name: ur.role.name,
            description: ur.role.description || undefined,
            isActive: ur.role.isActive,
            isSystem: ur.role.isSystem,
          },
          ur.role.id,
          ur.role.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding roles by user: ${error.message}`);
      } else {
        this.logger.error(`Error finding roles by user: ${error}`);
      }
      throw error;
    }
  }

  async existsByName(name: string, orgId?: string): Promise<boolean> {
    try {
      const whereClause: { name: string; orgId?: string | null } = { name };
      if (orgId !== undefined) {
        whereClause.orgId = orgId;
      } else {
        whereClause.orgId = null;
      }

      const count = await this.prisma.role.count({
        where: whereClause,
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking role existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking role existence: ${error}`);
      }
      throw error;
    }
  }

  async countByStatus(isActive: boolean, orgId: string): Promise<number> {
    try {
      return await this.prisma.role.count({
        where: { isActive, orgId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error counting roles by status: ${error.message}`);
      } else {
        this.logger.error(`Error counting roles by status: ${error}`);
      }
      throw error;
    }
  }

  async findRolesWithPermissions(permissionIds: string[], orgId: string): Promise<Role[]> {
    try {
      const rolesData = await this.prisma.role.findMany({
        where: {
          orgId,
          permissions: {
            some: {
              permissionId: {
                in: permissionIds,
              },
            },
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
          },
          roleData.id,
          roleData.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding roles with permissions: ${error.message}`);
      } else {
        this.logger.error(`Error finding roles with permissions: ${error}`);
      }
      throw error;
    }
  }

  async save(role: Role): Promise<Role> {
    try {
      // Validate: system roles must not have orgId
      if (role.isSystem && role.orgId) {
        throw new Error('System roles cannot have an organization ID');
      }
      // Validate: custom roles must have orgId
      if (!role.isSystem && !role.orgId) {
        throw new Error('Custom roles must have an organization ID');
      }

      // Check if role exists in database to decide create vs update
      const existingRole = await this.prisma.role.findUnique({
        where: { id: role.id },
      });

      if (existingRole) {
        // Update existing role
        const updatedRole = await this.prisma.role.update({
          where: { id: role.id },
          data: {
            name: role.name,
            description: role.description,
            isActive: role.isActive,
            isSystem: role.isSystem,
            orgId: role.orgId || null,
          },
        });

        return Role.reconstitute(
          {
            name: updatedRole.name,
            description: updatedRole.description || undefined,
            isActive: updatedRole.isActive,
            isSystem: updatedRole.isSystem,
          },
          updatedRole.id,
          updatedRole.orgId || undefined
        );
      } else {
        // Create new role
        const newRole = await this.prisma.role.create({
          data: {
            id: role.id,
            name: role.name,
            description: role.description,
            isActive: role.isActive,
            isSystem: role.isSystem,
            orgId: role.orgId || null,
          },
        });

        return Role.reconstitute(
          {
            name: newRole.name,
            description: newRole.description || undefined,
            isActive: newRole.isActive,
            isSystem: newRole.isSystem,
          },
          newRole.id,
          newRole.orgId || undefined
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving role: ${error.message}`);
      } else {
        this.logger.error(`Error saving role: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, _orgId: string): Promise<void> {
    try {
      await this.prisma.role.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting role: ${error.message}`);
      } else {
        this.logger.error(`Error deleting role: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId?: string): Promise<boolean> {
    try {
      const whereClause: { id: string; orgId?: string | null } = { id };
      if (orgId !== undefined) {
        whereClause.orgId = orgId;
      }

      const count = await this.prisma.role.count({
        where: whereClause,
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking role existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking role existence: ${error}`);
      }
      throw error;
    }
  }

  async findSystemRoles(): Promise<Role[]> {
    try {
      const rolesData = await this.prisma.role.findMany({
        where: {
          isSystem: true,
          orgId: null,
        },
        orderBy: { name: 'asc' },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
          },
          roleData.id,
          roleData.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding system roles: ${error.message}`);
      } else {
        this.logger.error(`Error finding system roles: ${error}`);
      }
      throw error;
    }
  }

  async findCustomRoles(orgId: string): Promise<Role[]> {
    try {
      const rolesData = await this.prisma.role.findMany({
        where: {
          isSystem: false,
          orgId,
        },
        orderBy: { name: 'asc' },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
          },
          roleData.id,
          roleData.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding custom roles: ${error.message}`);
      } else {
        this.logger.error(`Error finding custom roles: ${error}`);
      }
      throw error;
    }
  }

  async findAvailableRolesForOrganization(orgId: string): Promise<Role[]> {
    try {
      const rolesData = await this.prisma.role.findMany({
        where: {
          OR: [
            { isSystem: true, orgId: null },
            { isSystem: false, orgId },
          ],
        },
        orderBy: { name: 'asc' },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
            isSystem: roleData.isSystem,
          },
          roleData.id,
          roleData.orgId || undefined
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding available roles: ${error.message}`);
      } else {
        this.logger.error(`Error finding available roles: ${error}`);
      }
      throw error;
    }
  }
}
