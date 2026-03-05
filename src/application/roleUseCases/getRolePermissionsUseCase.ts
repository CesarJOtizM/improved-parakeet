import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ROLE_ID_REQUIRED, ROLE_NOT_FOUND, ROLE_ORG_MISMATCH } from '@shared/constants/error-codes';
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

export interface IGetRolePermissionsRequest {
  roleId: string;
  orgId: string;
}

export interface IRolePermissionData {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

export type IGetRolePermissionsResponse = IApiResponseSuccess<IRolePermissionData[]>;

@Injectable()
export class GetRolePermissionsUseCase {
  private readonly logger = new Logger(GetRolePermissionsUseCase.name);

  constructor(
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetRolePermissionsRequest
  ): Promise<Result<IGetRolePermissionsResponse, DomainError>> {
    this.logger.log('Getting permissions for role', {
      roleId: request.roleId,
      orgId: request.orgId,
    });

    if (!request.roleId) {
      return err(new ValidationError('Role ID is required', ROLE_ID_REQUIRED));
    }

    const role = await this.roleRepository.findById(request.roleId);

    if (!role) {
      return err(new NotFoundError('Role not found', ROLE_NOT_FOUND));
    }

    if (!role.isSystem && role.orgId !== request.orgId) {
      return err(new NotFoundError('Role not found in this organization', ROLE_ORG_MISMATCH));
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: request.roleId },
      include: { permission: true },
    });

    const permissions = rolePermissions.map(rp => ({
      id: rp.permission.id,
      name: rp.permission.name,
      description: rp.permission.description,
      module: rp.permission.module,
      action: rp.permission.action,
    }));

    this.logger.log('Role permissions retrieved successfully', {
      roleId: request.roleId,
      count: permissions.length,
    });

    return ok({
      success: true,
      message: 'Role permissions retrieved successfully',
      data: permissions as IRolePermissionData[],
      timestamp: new Date().toISOString(),
    });
  }
}
