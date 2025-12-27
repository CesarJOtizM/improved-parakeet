import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface IUpdateRoleRequest {
  roleId: string;
  description?: string;
  isActive?: boolean;
  orgId: string;
  updatedBy: string;
}

export interface IUpdateRoleData {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  orgId: string;
  updatedAt: Date;
}

export type IUpdateRoleResponse = IApiResponseSuccess<IUpdateRoleData>;

@Injectable()
export class UpdateRoleUseCase {
  private readonly logger = new Logger(UpdateRoleUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: IUpdateRoleRequest): Promise<Result<IUpdateRoleResponse, DomainError>> {
    this.logger.log('Updating role', { roleId: request.roleId, orgId: request.orgId });

    // Find role
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      return err(new NotFoundError('Role not found'));
    }

    // Cannot update system roles
    if (role.isSystem) {
      return err(new BusinessRuleError('Cannot update system roles'));
    }

    // Verify role belongs to this organization
    if (role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not found in this organization'));
    }

    // Validate description length if provided
    if (request.description !== undefined && request.description.length > 500) {
      return err(new ValidationError('Description must not exceed 500 characters'));
    }

    // Update role
    role.update({
      description: request.description,
      isActive: request.isActive,
    });

    // Save updated role
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log('Role updated successfully', {
      roleId: updatedRole.id,
      name: updatedRole.name,
    });

    return ok({
      success: true,
      message: 'Role updated successfully',
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        isActive: updatedRole.isActive,
        isSystem: updatedRole.isSystem,
        orgId: updatedRole.orgId!,
        updatedAt: updatedRole.updatedAt,
      } as IUpdateRoleData,
      timestamp: new Date().toISOString(),
    });
  }
}
