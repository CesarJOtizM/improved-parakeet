import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface IGetRolesRequest {
  orgId: string;
}

export interface IGetRolesData {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  orgId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetRolesResponse = IApiResponseSuccess<IGetRolesData[]>;

@Injectable()
export class GetRolesUseCase {
  private readonly logger = new Logger(GetRolesUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: IGetRolesRequest): Promise<IGetRolesResponse> {
    this.logger.log('Getting available roles for organization', { orgId: request.orgId });

    if (!request.orgId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Get available roles (system + custom for this org)
    const roles = await this.roleRepository.findAvailableRolesForOrganization(request.orgId);

    this.logger.log('Roles retrieved successfully', {
      orgId: request.orgId,
      count: roles.length,
    });

    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isSystem: role.isSystem,
        orgId: role.orgId,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })) as IGetRolesData[],
      timestamp: new Date().toISOString(),
    };
  }
}
