import { Role } from '@auth/domain/entities/role.entity';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleData } from './types';
import type { IPermissionRepository, IRoleRepository } from '@auth/domain/repositories';

export interface ICreateRoleRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
  orgId: string;
}

export type ICreateRoleResponse = IApiResponseSuccess<IRoleData>;

@Injectable()
export class CreateRoleUseCase {
  private readonly logger = new Logger(CreateRoleUseCase.name);

  constructor(
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository,
    @Inject('PermissionRepository') private readonly permissionRepository: IPermissionRepository
  ) {}

  async execute(request: ICreateRoleRequest): Promise<ICreateRoleResponse> {
    try {
      this.logger.log(`Creating role with name: ${request.name} for org: ${request.orgId}`);

      // Verificar que el nombre del rol no exista
      const existingRole = await this.roleRepository.findByName(request.name, request.orgId);
      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }

      // Validar permisos si se proporcionan
      if (request.permissionIds && request.permissionIds.length > 0) {
        for (const permissionId of request.permissionIds) {
          const permission = await this.permissionRepository.findById(permissionId, 'system');
          if (!permission) {
            throw new ConflictException(`Permission with ID ${permissionId} not found`);
          }
        }
      }

      // Crear entidad de rol
      const role = Role.create(
        {
          name: request.name,
          description: request.description,
          isActive: request.isActive ?? true,
        },
        request.orgId
      );

      // Guardar rol
      await this.roleRepository.save(role);

      // Asignar permisos si se proporcionan
      if (request.permissionIds && request.permissionIds.length > 0) {
        // TODO: Implementar asignación de permisos
        // await this.assignPermissionsToRole(role.id, request.permissionIds);
      }

      this.logger.log(`Role created successfully with ID: ${role.id}`);

      return {
        success: true,
        message: 'Role created successfully',
        data: {
          id: role.id,
          name: role.name,
          description: role.description,
          isActive: role.isActive,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Create role use case failed:', error);
      throw error;
    }
  }
}
