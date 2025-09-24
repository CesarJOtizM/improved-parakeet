import { Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import { IPermissionData } from './types';

import type { IPermissionRepository } from '@auth/domain/repositories';

export interface IGetPermissionsRequest {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  search?: string;
}

export interface IGetPermissionsData {
  permissions: IPermissionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type IGetPermissionsResponse = IApiResponseSuccess<IGetPermissionsData>;

@Injectable()
export class GetPermissionsUseCase {
  private readonly logger = new Logger(GetPermissionsUseCase.name);

  constructor(
    @Inject('PermissionRepository') private readonly permissionRepository: IPermissionRepository
  ) {}

  async execute(request: IGetPermissionsRequest): Promise<IGetPermissionsResponse> {
    try {
      const page = request.page || 1;
      const limit = request.limit || 10;
      const offset = (page - 1) * limit;

      this.logger.log(`Getting permissions, page: ${page}, limit: ${limit}`);

      // Obtener permisos con paginación
      const permissions = await this.permissionRepository.findMany(
        {
          module: request.module,
          action: request.action,
          search: request.search,
        },
        {
          page,
          limit,
          offset,
        }
      );

      // Contar total de permisos
      const total = await this.permissionRepository.count({
        module: request.module,
        action: request.action,
        search: request.search,
      });

      const totalPages = Math.ceil(total / limit);

      // Mapear permisos a formato de respuesta
      const permissionData: IPermissionData[] = permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        module: permission.module,
        action: permission.action,
        createdAt: permission.createdAt.toISOString(),
        updatedAt: permission.updatedAt.toISOString(),
      }));

      return {
        success: true,
        message: 'Permissions retrieved successfully',
        data: {
          permissions: permissionData,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Get permissions use case failed:', error);
      throw error;
    }
  }
}
