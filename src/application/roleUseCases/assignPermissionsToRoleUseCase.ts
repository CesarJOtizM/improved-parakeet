import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface IAssignPermissionsToRoleRequest {
  roleId: string;
  permissionIds: string[];
  orgId: string;
  assignedBy: string;
}

export interface IAssignPermissionsToRoleData {
  roleId: string;
  roleName: string;
  assignedPermissions: string[];
  assignedAt: Date;
}

export type IAssignPermissionsToRoleResponse = IApiResponseSuccess<IAssignPermissionsToRoleData>;

@Injectable()
export class AssignPermissionsToRoleUseCase {
  private readonly logger = new Logger(AssignPermissionsToRoleUseCase.name);

  constructor(
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IAssignPermissionsToRoleRequest
  ): Promise<Result<IAssignPermissionsToRoleResponse, DomainError>> {
    this.logger.log('Assigning permissions to role', {
      roleId: request.roleId,
      permissionCount: request.permissionIds.length,
      orgId: request.orgId,
    });

    if (!request.permissionIds || request.permissionIds.length === 0) {
      return err(new ValidationError('At least one permission ID is required'));
    }

    // Find role
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      return err(new NotFoundError('Role not found'));
    }

    // Verify role is available for this organization
    if (!role.isSystem && role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not found in this organization'));
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: request.permissionIds,
        },
      },
    });

    if (permissions.length !== request.permissionIds.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = request.permissionIds.filter(id => !foundIds.includes(id));
      return err(new NotFoundError(`Permissions not found: ${missingIds.join(', ')}`));
    }

    // Remove existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId: request.roleId,
      },
    });

    // Assign new permissions
    const rolePermissions = request.permissionIds.map(permissionId => ({
      roleId: request.roleId,
      permissionId,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });

    this.logger.log('Permissions assigned to role successfully', {
      roleId: request.roleId,
      permissionCount: request.permissionIds.length,
    });

    return ok({
      success: true,
      message: 'Permissions assigned successfully',
      data: {
        roleId: role.id,
        roleName: role.name,
        assignedPermissions: permissions.map(p => p.name),
        assignedAt: new Date(),
      } as IAssignPermissionsToRoleData,
      timestamp: new Date().toISOString(),
    });
  }
}
