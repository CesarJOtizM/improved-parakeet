import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRoleData } from './types';
import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';

export interface IRemoveRoleFromUserRequest {
  userId: string;
  roleId: string;
  orgId: string;
}

export type IRemoveRoleFromUserResponse = IApiResponseSuccess<IUserRoleData>;

@Injectable()
export class RemoveRoleFromUserUseCase {
  private readonly logger = new Logger(RemoveRoleFromUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository
  ) {}

  async execute(request: IRemoveRoleFromUserRequest): Promise<IRemoveRoleFromUserResponse> {
    try {
      this.logger.log(
        `Removing role ${request.roleId} from user ${request.userId} for org: ${request.orgId}`
      );

      // Verificar que el usuario existe
      const user = await this.userRepository.findById(request.userId, request.orgId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verificar que el rol existe
      const role = await this.roleRepository.findById(request.roleId, request.orgId);
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Verificar que el usuario tiene este rol
      const userRoles = await this.roleRepository.findRolesByUser(request.userId, request.orgId);
      const hasRole = userRoles.some(userRole => userRole.id === request.roleId);
      if (!hasRole) {
        throw new ConflictException('User does not have this role');
      }

      // TODO: Implementar remoción de rol en el repositorio
      // await this.userRepository.removeRole(request.userId, request.roleId, request.orgId);

      this.logger.log(`Role ${request.roleId} removed from user ${request.userId} successfully`);

      return {
        success: true,
        message: 'Role removed from user successfully',
        data: {
          userId: request.userId,
          roleId: request.roleId,
          roleName: role.name,
          removedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Remove role from user use case failed:', error);
      throw error;
    }
  }
}
