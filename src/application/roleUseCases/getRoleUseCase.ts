import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface IGetRoleRequest {
  roleId: string;
  orgId: string;
}

export interface IGetRoleData {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  orgId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetRoleResponse = IApiResponseSuccess<IGetRoleData>;

@Injectable()
export class GetRoleUseCase {
  private readonly logger = new Logger(GetRoleUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: IGetRoleRequest): Promise<IGetRoleResponse> {
    this.logger.log('Getting role', { roleId: request.roleId, orgId: request.orgId });

    // Try to find role (can be system or custom)
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify role is available for this organization
    // System roles are available to all, custom roles only to their org
    if (!role.isSystem && role.orgId !== request.orgId) {
      throw new NotFoundException('Role not found in this organization');
    }

    this.logger.log('Role retrieved successfully', {
      roleId: role.id,
      name: role.name,
      isSystem: role.isSystem,
    });

    return {
      success: true,
      message: 'Role retrieved successfully',
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isSystem: role.isSystem,
        orgId: role.orgId,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      } as IGetRoleData,
      timestamp: new Date().toISOString(),
    };
  }
}
