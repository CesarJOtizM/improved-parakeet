import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ROLE_DELETE_DENIED,
  ROLE_NOT_FOUND,
  ROLE_ORG_MISMATCH,
} from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
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

  async execute(request: IDeleteRoleRequest): Promise<Result<IDeleteRoleResponse, DomainError>> {
    this.logger.log('Deleting role', { roleId: request.roleId, orgId: request.orgId });

    // Find role
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      return err(new NotFoundError('Role not found', ROLE_NOT_FOUND));
    }

    // Validate deletion
    const validation = RoleAssignmentService.canDeleteRole(role);
    if (!validation.isValid) {
      return err(
        new BusinessRuleError(
          `Cannot delete role: ${validation.errors.join(', ')}`,
          ROLE_DELETE_DENIED
        )
      );
    }

    // Verify role belongs to this organization
    if (role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not found in this organization', ROLE_ORG_MISMATCH));
    }

    // Check if role is assigned to any users
    const userRoleCount = await this.prisma.userRole.count({
      where: {
        roleId: request.roleId,
        orgId: request.orgId,
      },
    });

    if (userRoleCount > 0) {
      return err(
        new BusinessRuleError(
          `Cannot delete role: it is assigned to ${userRoleCount} user(s). Remove assignments first.`,
          ROLE_DELETE_DENIED
        )
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

    return ok({
      success: true,
      message: 'Role deleted successfully',
      data: {
        roleId: request.roleId,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
