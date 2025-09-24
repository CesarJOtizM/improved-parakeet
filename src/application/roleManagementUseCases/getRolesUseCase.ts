import { Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleData } from './types';
import type { IRoleRepository } from '@auth/domain/repositories';

export interface IGetRolesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface IGetRolesData {
  roles: IRoleData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type IGetRolesResponse = IApiResponseSuccess<IGetRolesData>;

@Injectable()
export class GetRolesUseCase {
  private readonly logger = new Logger(GetRolesUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: IGetRolesRequest): Promise<IGetRolesResponse> {
    try {
      const page = request.page || 1;
      const limit = request.limit || 10;
      const offset = (page - 1) * limit;

      this.logger.log(`Getting roles for org: ${request.orgId}, page: ${page}, limit: ${limit}`);

      // Obtener roles con paginación
      const roles = await this.roleRepository.findMany(
        {
          orgId: request.orgId,
          isActive: request.isActive,
          search: request.search,
        },
        {
          page,
          limit,
          offset,
        }
      );

      // Contar total de roles
      const total = await this.roleRepository.count({
        orgId: request.orgId,
        isActive: request.isActive,
        search: request.search,
      });

      const totalPages = Math.ceil(total / limit);

      // Mapear roles a formato de respuesta
      const roleData: IRoleData[] = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      }));

      return {
        success: true,
        message: 'Roles retrieved successfully',
        data: {
          roles: roleData,
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
      this.logger.error('Get roles use case failed:', error);
      throw error;
    }
  }
}
