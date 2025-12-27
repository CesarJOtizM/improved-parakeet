import { RoleAssignedEvent } from '@auth/domain/events/roleAssigned.event';
import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';

export interface IAssignRoleToUserRequest {
  userId: string;
  roleId: string;
  orgId: string;
  assignedBy: string;
}

export interface IUserRoleData {
  userId: string;
  roleId: string;
  roleName: string;
  assignedAt: Date;
}

export type IAssignRoleToUserResponse = IApiResponseSuccess<IUserRoleData>;

@Injectable()
export class AssignRoleToUserUseCase {
  private readonly logger = new Logger(AssignRoleToUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(
    request: IAssignRoleToUserRequest
  ): Promise<Result<IAssignRoleToUserResponse, DomainError>> {
    this.logger.log('Assigning role to user', {
      userId: request.userId,
      roleId: request.roleId,
      orgId: request.orgId,
      assignedBy: request.assignedBy,
    });

    // Get user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      return err(new NotFoundError('User not found'));
    }

    // Get role (can be system or custom)
    const role = await this.roleRepository.findById(request.roleId);
    if (!role) {
      return err(new NotFoundError('Role not found'));
    }

    // Verify role is available for this organization
    // System roles are available to all, custom roles only to their org
    if (!role.isSystem && role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not available for this organization'));
    }

    // Get current user roles for validation
    const currentUserRoles = user.roles || [];

    // Validate role assignment
    const validation = RoleAssignmentService.canAssignRole(
      user,
      role,
      request.assignedBy,
      currentUserRoles
    );
    if (!validation.isValid) {
      return err(new BusinessRuleError(`Cannot assign role: ${validation.errors.join(', ')}`));
    }

    // Check if user already has this role
    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId_orgId: {
          userId: request.userId,
          roleId: request.roleId,
          orgId: request.orgId,
        },
      },
    });

    if (existingAssignment) {
      return err(new ConflictError('User already has this role'));
    }

    // Assign role
    await this.prisma.userRole.create({
      data: {
        userId: request.userId,
        roleId: request.roleId,
        orgId: request.orgId,
      },
    });

    // Emit domain event
    const event = new RoleAssignedEvent(
      request.userId,
      request.roleId,
      role.name,
      request.assignedBy,
      request.orgId
    );
    user.addDomainEventFromService(event);

    // Dispatch domain events
    await this.eventDispatcher.markAndDispatch(user.domainEvents);
    user.clearEvents();

    this.logger.log('Role assigned successfully', {
      userId: request.userId,
      roleId: request.roleId,
      roleName: role.name,
    });

    return ok({
      success: true,
      message: 'Role assigned successfully',
      data: {
        userId: request.userId,
        roleId: request.roleId,
        roleName: role.name,
        assignedAt: new Date(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
