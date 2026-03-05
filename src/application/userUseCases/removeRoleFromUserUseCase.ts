import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  USER_ASSIGNER_NOT_FOUND,
  USER_NOT_FOUND,
  USER_ROLE_ASSIGN_DENIED,
  USER_ROLE_NOT_ASSIGNED,
  USER_ROLE_NOT_FOUND,
  USER_ROLE_ORG_MISMATCH,
} from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { invalidateEntityCache } from '@shared/infrastructure/cache';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';
import type { ICacheService } from '@shared/ports/cache';

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
    private readonly prisma: PrismaService,
    @Inject('CacheService')
    @Optional()
    private readonly cacheService?: ICacheService
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
      return err(new NotFoundError('User not found', USER_NOT_FOUND));
    }

    // Get role (can be system or custom)
    const role = await this.roleRepository.findById(request.roleId);
    if (!role) {
      return err(new NotFoundError('Role not found', USER_ROLE_NOT_FOUND));
    }

    // Verify role is available for this organization
    // System roles are available to all, custom roles only to their org
    if (!role.isSystem && role.orgId !== request.orgId) {
      return err(
        new NotFoundError('Role not available for this organization', USER_ROLE_ORG_MISMATCH)
      );
    }

    // Get the user who is removing the role (removedBy) to get their roles for validation
    const removingUser = await this.userRepository.findById(request.removedBy, request.orgId);
    if (!removingUser) {
      return err(new NotFoundError('User removing the role not found', USER_ASSIGNER_NOT_FOUND));
    }

    // Get current user roles for validation (roles of the user making the removal)
    const currentUserRoles = removingUser.roles || [];

    // Validate role removal
    const validation = RoleAssignmentService.canRemoveRole(
      user,
      role,
      request.removedBy,
      currentUserRoles
    );
    if (!validation.isValid) {
      return err(
        new BusinessRuleError(
          `Cannot remove role: ${validation.errors.join(', ')}`,
          USER_ROLE_ASSIGN_DENIED
        )
      );
    }

    // Check if user has this role
    // Use findFirst to handle both system and custom roles correctly
    const existingAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId: request.userId,
        roleId: request.roleId,
        orgId: request.orgId,
      },
    });

    if (!existingAssignment) {
      return err(new NotFoundError('User does not have this role', USER_ROLE_NOT_ASSIGNED));
    }

    // Remove role
    await this.prisma.userRole.delete({
      where: {
        id: existingAssignment.id,
      },
    });

    // Invalidate user cache to ensure fresh data on next fetch
    if (this.cacheService) {
      await invalidateEntityCache(this.cacheService, 'user', request.userId, request.orgId);
    }

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
