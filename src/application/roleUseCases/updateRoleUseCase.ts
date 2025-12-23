import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

  async execute(request: IUpdateRoleRequest): Promise<IUpdateRoleResponse> {
    this.logger.log('Updating role', { roleId: request.roleId, orgId: request.orgId });

    // Find role
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Cannot update system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot update system roles');
    }

    // Verify role belongs to this organization
    if (role.orgId !== request.orgId) {
      throw new NotFoundException('Role not found in this organization');
    }

    // Validate description length if provided
    if (request.description !== undefined && request.description.length > 500) {
      throw new BadRequestException('Description must not exceed 500 characters');
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

    return {
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
    };
  }
}
