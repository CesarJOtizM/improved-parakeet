import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';

export interface IRemoveRoleFromUserRequest {
  userId: string;
  roleId: string;
  orgId: string;
  removedBy: string;
}

export interface IUserRoleRemovalData {
  userId: string;
  roleId: string;
  roleName: string;
  removedAt: Date;
}

export type IRemoveRoleFromUserResponse = IApiResponseSuccess<IUserRoleRemovalData>;

@Injectable()
export class RemoveRoleFromUserUseCase {
  private readonly logger = new Logger(RemoveRoleFromUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IRemoveRoleFromUserRequest
  ): Promise<Result<IRemoveRoleFromUserResponse, DomainError>> {
    this.logger.log('Removing role from user', {
      userId: request.userId,
      roleId: request.roleId,
      orgId: request.orgId,
      removedBy: request.removedBy,
    });

    // Get user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      return err(new NotFoundError('User not found'));
    }

    // Get role
    const role = await this.roleRepository.findById(request.roleId, request.orgId);
    if (!role) {
      return err(new NotFoundError('Role not found'));
    }

    // Get current user roles for validation
    const currentUserRoles = user.roles || [];

    // Validate role removal
    const validation = RoleAssignmentService.canRemoveRole(
      user,
      role,
      request.removedBy,
      currentUserRoles
    );
    if (!validation.isValid) {
      return err(new BusinessRuleError(`Cannot remove role: ${validation.errors.join(', ')}`));
    }

    // Check if user has this role
    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId_orgId: {
          userId: request.userId,
          roleId: request.roleId,
          orgId: request.orgId,
        },
      },
    });

    if (!existingAssignment) {
      return err(new NotFoundError('User does not have this role'));
    }

    // Remove role
    await this.prisma.userRole.delete({
      where: {
        userId_roleId_orgId: {
          userId: request.userId,
          roleId: request.roleId,
          orgId: request.orgId,
        },
      },
    });

    this.logger.log('Role removed successfully', {
      userId: request.userId,
      roleId: request.roleId,
      roleName: role.name,
    });

    return ok({
      success: true,
      message: 'Role removed successfully',
      data: {
        userId: request.userId,
        roleId: request.roleId,
        roleName: role.name,
        removedAt: new Date(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
