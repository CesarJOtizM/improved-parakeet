import { Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserData } from './types';
import type { IUserRepository } from '@auth/domain';

export interface IGetUsersRequest {
  orgId: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface IGetUsersData {
  users: IUserData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type IGetUsersResponse = IApiResponseSuccess<IGetUsersData>;

@Injectable()
export class GetUsersUseCase {
  private readonly logger = new Logger(GetUsersUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IGetUsersRequest): Promise<IGetUsersResponse> {
    try {
      const page = request.page || 1;
      const limit = request.limit || 10;
      const offset = (page - 1) * limit;

      this.logger.log(`Getting users for org: ${request.orgId}, page: ${page}, limit: ${limit}`);

      // Obtener usuarios con paginación
      const users = await this.userRepository.findMany(
        {
          orgId: request.orgId,
          status: request.status,
          search: request.search,
        },
        {
          page,
          limit,
          offset,
        }
      );

      // Contar total de usuarios
      const total = await this.userRepository.count({
        orgId: request.orgId,
        status: request.status,
        search: request.search,
      });

      const totalPages = Math.ceil(total / limit);

      // Mapear usuarios a formato de respuesta
      const userData: IUserData[] = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status.toString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        roles: user.roles || [],
        permissions: user.permissions || [],
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: userData,
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
      this.logger.error('Get users use case failed:', error);
      throw error;
    }
  }
}
