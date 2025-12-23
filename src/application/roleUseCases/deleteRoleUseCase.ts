import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface IDeleteRoleRequest {
  roleId: string;
  orgId: string;
  deletedBy: string;
}

export type IDeleteRoleResponse = IApiResponseSuccess<{ roleId: string }>;

@Injectable()
export class DeleteRoleUseCase {
  private readonly logger = new Logger(DeleteRoleUseCase.name);

  constructor(
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IDeleteRoleRequest): Promise<IDeleteRoleResponse> {
    this.logger.log('Deleting role', { roleId: request.roleId, orgId: request.orgId });

    // Find role
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate deletion
    const validation = RoleAssignmentService.canDeleteRole(role);
    if (!validation.isValid) {
      throw new BadRequestException(`Cannot delete role: ${validation.errors.join(', ')}`);
    }

    // Verify role belongs to this organization
    if (role.orgId !== request.orgId) {
      throw new NotFoundException('Role not found in this organization');
    }

    // Check if role is assigned to any users
    const userRoleCount = await this.prisma.userRole.count({
      where: {
        roleId: request.roleId,
        orgId: request.orgId,
      },
    });

    if (userRoleCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: it is assigned to ${userRoleCount} user(s). Remove assignments first.`
      );
    }

    // Delete role permissions first
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId: request.roleId,
      },
    });

    // Delete role
    await this.roleRepository.delete(request.roleId, request.orgId);

    this.logger.log('Role deleted successfully', {
      roleId: request.roleId,
      name: role.name,
    });

    return {
      success: true,
      message: 'Role deleted successfully',
      data: {
        roleId: request.roleId,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
