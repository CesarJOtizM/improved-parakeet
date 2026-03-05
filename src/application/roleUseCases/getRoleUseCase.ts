import { Inject, Injectable, Logger } from '@nestjs/common';
import { ROLE_NOT_FOUND, ROLE_ORG_MISMATCH } from '@shared/constants/error-codes';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
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

  async execute(request: IGetRoleRequest): Promise<Result<IGetRoleResponse, DomainError>> {
    this.logger.log('Getting role', { roleId: request.roleId, orgId: request.orgId });

    // Try to find role (can be system or custom)
    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      return err(new NotFoundError('Role not found', ROLE_NOT_FOUND));
    }

    // Verify role is available for this organization
    // System roles are available to all, custom roles only to their org
    if (!role.isSystem && role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not found in this organization', ROLE_ORG_MISMATCH));
    }

    this.logger.log('Role retrieved successfully', {
      roleId: role.id,
      name: role.name,
      isSystem: role.isSystem,
    });

    return ok({
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
    });
  }
}
