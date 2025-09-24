import { Permission } from '@auth/domain/entities/permission.entity';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IPermissionData } from './types';
import type { IPermissionRepository } from '@auth/domain/repositories';

export interface ICreatePermissionRequest {
  name: string;
  description?: string;
  module: string;
  action: string;
}

export type ICreatePermissionResponse = IApiResponseSuccess<IPermissionData>;

@Injectable()
export class CreatePermissionUseCase {
  private readonly logger = new Logger(CreatePermissionUseCase.name);

  constructor(
    @Inject('PermissionRepository') private readonly permissionRepository: IPermissionRepository
  ) {}

  async execute(request: ICreatePermissionRequest): Promise<ICreatePermissionResponse> {
    try {
      this.logger.log(`Creating permission with name: ${request.name}`);

      // Verificar que el nombre del permiso no exista
      const existingPermission = await this.permissionRepository.findByName(request.name);
      if (existingPermission) {
        throw new ConflictException('Permission with this name already exists');
      }

      // Crear entidad de permiso
      const permission = Permission.create(
        {
          name: request.name,
          description: request.description,
          module: request.module,
          action: request.action,
        },
        'system' // Los permisos son globales, no por organización
      );

      // Guardar permiso
      await this.permissionRepository.save(permission);

      this.logger.log(`Permission created successfully with ID: ${permission.id}`);

      return {
        success: true,
        message: 'Permission created successfully',
        data: {
          id: permission.id,
          name: permission.name,
          description: permission.description,
          module: permission.module,
          action: permission.action,
          createdAt: permission.createdAt.toISOString(),
          updatedAt: permission.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Create permission use case failed:', error);
      throw error;
    }
  }
}
