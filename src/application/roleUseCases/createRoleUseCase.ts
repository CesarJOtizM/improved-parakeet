import { Role } from '@auth/domain/entities/role.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  err,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleRepository } from '@auth/domain/repositories';

export interface ICreateRoleRequest {
  name: string;
  description?: string;
  orgId: string;
  createdBy: string;
}

export interface ICreateRoleData {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateRoleResponse = IApiResponseSuccess<ICreateRoleData>;

@Injectable()
export class CreateRoleUseCase {
  private readonly logger = new Logger(CreateRoleUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: ICreateRoleRequest): Promise<Result<ICreateRoleResponse, DomainError>> {
    this.logger.log('Creating custom role', { name: request.name, orgId: request.orgId });

    // Validate role name format
    if (!request.name || request.name.trim().length < 3) {
      return err(new ValidationError('Role name must be at least 3 characters long'));
    }

    if (request.name.length > 50) {
      return err(new ValidationError('Role name must not exceed 50 characters'));
    }

    // Check if role name already exists (system or custom in this org)
    const existingSystemRole = await this.roleRepository.findByName(request.name);
    if (existingSystemRole) {
      return err(new ConflictError('Role name already exists as a system role'));
    }

    const existingCustomRole = await this.roleRepository.findByName(request.name, request.orgId);
    if (existingCustomRole) {
      return err(new ConflictError('Role name already exists in this organization'));
    }

    // Create custom role (isSystem = false, requires orgId)
    const role = Role.create(
      {
        name: request.name.trim().toUpperCase(),
        description: request.description?.trim(),
        isActive: true,
        isSystem: false,
      },
      request.orgId
    );

    // Save role
    const savedRole = await this.roleRepository.save(role);

    this.logger.log('Custom role created successfully', {
      roleId: savedRole.id,
      name: savedRole.name,
      orgId: savedRole.orgId,
    });

    return ok({
      success: true,
      message: 'Role created successfully',
      data: {
        id: savedRole.id,
        name: savedRole.name,
        description: savedRole.description,
        isActive: savedRole.isActive,
        isSystem: savedRole.isSystem,
        orgId: savedRole.orgId!,
        createdAt: savedRole.createdAt,
        updatedAt: savedRole.updatedAt,
      } as ICreateRoleData,
      timestamp: new Date().toISOString(),
    });
  }
}
