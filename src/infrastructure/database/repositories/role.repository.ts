import { Role } from '@auth/domain/entities/role.entity';
import { IRoleRepository } from '@auth/domain/repositories/roleRepository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RoleRepository implements IRoleRepository {
  private readonly logger = new Logger(RoleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Role | null> {
    try {
      const roleData = await this.prisma.role.findFirst({
        where: { id, orgId },
      });

      if (!roleData) return null;

      return Role.reconstitute(
        {
          name: roleData.name,
          description: roleData.description || undefined,
          isActive: roleData.isActive,
        },
        roleData.id,
        roleData.orgId
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
    try {
      const rolesData = await this.prisma.role.findMany({
        where: { orgId },
        orderBy: { name: 'asc' },
      });

      return rolesData.map(roleData =>
        Role.reconstitute(
          {
            name: roleData.name,
            description: roleData.description || undefined,
            isActive: roleData.isActive,
          },
          roleData.id,
          roleData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all roles: ${error.message}`);
      } else {
        this.logger.error(`Error finding all roles: ${error}`);
      }
      throw error;
    }
  }

  async findByName(name: string, orgId: string): Promise<Role | null> {
    try {
      const roleData = await this.prisma.role.findFirst({
        where: {
          name,
          orgId,
        },
      });

      if (!roleData) return null;

      return Role.reconstitute(
        {
          name: roleData.name,
          description: roleData.description || undefined,
          isActive: roleData.isActive,
        },
        roleData.id,
        roleData.orgId
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
          },
          roleData.id,
          roleData.orgId
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
          },
          ur.role.id,
          ur.role.orgId
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

  async existsByName(name: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.role.count({
        where: {
          name,
          orgId,
        },
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
          },
          roleData.id,
          roleData.orgId
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
      if (role.id) {
        // Update existing role
        const updatedRole = await this.prisma.role.update({
          where: { id: role.id },
          data: {
            name: role.name,
            description: role.description,
            isActive: role.isActive,
          },
        });

        return Role.reconstitute(
          {
            name: updatedRole.name,
            description: updatedRole.description || undefined,
            isActive: updatedRole.isActive,
          },
          updatedRole.id,
          updatedRole.orgId
        );
      } else {
        // Create new role
        const newRole = await this.prisma.role.create({
          data: {
            name: role.name,
            description: role.description,
            isActive: role.isActive,
            orgId: role.orgId,
          },
        });

        return Role.reconstitute(
          {
            name: newRole.name,
            description: newRole.description || undefined,
            isActive: newRole.isActive,
          },
          newRole.id,
          newRole.orgId
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

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.role.count({
        where: { id, orgId },
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
}
