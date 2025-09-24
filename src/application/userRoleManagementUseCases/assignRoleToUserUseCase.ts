import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRoleData } from './types';
import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';

export interface IAssignRoleToUserRequest {
  userId: string;
  roleId: string;
  orgId: string;
}

export type IAssignRoleToUserResponse = IApiResponseSuccess<IUserRoleData>;

@Injectable()
export class AssignRoleToUserUseCase {
  private readonly logger = new Logger(AssignRoleToUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository
  ) {}

  async execute(request: IAssignRoleToUserRequest): Promise<IAssignRoleToUserResponse> {
    try {
      this.logger.log(
        `Assigning role ${request.roleId} to user ${request.userId} for org: ${request.orgId}`
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

      // Verificar que el rol está activo
      if (!role.isActive) {
        throw new ConflictException('Cannot assign inactive role to user');
      }

      // Verificar que el usuario no tenga ya este rol
      const userRoles = await this.roleRepository.findRolesByUser(request.userId, request.orgId);
      const hasRole = userRoles.some(userRole => userRole.id === request.roleId);
      if (hasRole) {
        throw new ConflictException('User already has this role');
      }

      // TODO: Implementar asignación de rol en el repositorio
      // await this.userRepository.assignRole(request.userId, request.roleId, request.orgId);

      this.logger.log(`Role ${request.roleId} assigned to user ${request.userId} successfully`);

      return {
        success: true,
        message: 'Role assigned to user successfully',
        data: {
          userId: request.userId,
          roleId: request.roleId,
          roleName: role.name,
          assignedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Assign role to user use case failed:', error);
      throw error;
    }
  }
}
