import { UserStatus } from '@auth/domain';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserData } from './types';
import type { IUserRepository } from '@auth/domain/repositories';

export interface IUpdateUserRequest {
  userId: string;
  orgId: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

interface IUserUpdateData {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

export type IUpdateUserResponse = IApiResponseSuccess<IUserData>;

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IUpdateUserRequest): Promise<IUpdateUserResponse> {
    try {
      this.logger.log(`Updating user with ID: ${request.userId} for org: ${request.orgId}`);

      // Buscar usuario existente
      const existingUser = await this.userRepository.findById(request.userId, request.orgId);
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Verificar que el email no esté en uso por otro usuario
      if (request.email && request.email !== existingUser.email) {
        const emailExists = await this.userRepository.existsByEmail(request.email, request.orgId);
        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Verificar que el username no esté en uso por otro usuario
      if (request.username && request.username !== existingUser.username) {
        const usernameExists = await this.userRepository.existsByUsername(
          request.username,
          request.orgId
        );
        if (usernameExists) {
          throw new ConflictException('User with this username already exists');
        }
      }

      // Actualizar propiedades del usuario
      const updateData: IUserUpdateData = {};
      if (request.email) updateData.email = request.email;
      if (request.username) updateData.username = request.username;
      if (request.firstName) updateData.firstName = request.firstName;
      if (request.lastName) updateData.lastName = request.lastName;
      if (request.status) updateData.status = UserStatus.create(request.status);

      // Aplicar actualizaciones
      existingUser.update(updateData);

      // Guardar cambios
      await this.userRepository.save(existingUser);

      // Obtener usuario actualizado
      const updatedUser = await this.userRepository.findById(request.userId, request.orgId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      this.logger.log(`User updated successfully with ID: ${request.userId}`);

      return {
        success: true,
        message: 'User updated successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          status: updatedUser.status.toString(),
          roles: updatedUser.roles || [],
          permissions: updatedUser.permissions || [],
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Update user use case failed:', error);
      throw error;
    }
  }
}
