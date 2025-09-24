import { User } from '@auth/domain/entities/user.entity';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserData } from './types';
import type { IRoleRepository, IUserRepository } from '@auth/domain/repositories';

export interface ICreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  status?: 'ACTIVE' | 'INACTIVE';
  roleIds?: string[];
  orgId: string;
}

export type ICreateUserResponse = IApiResponseSuccess<IUserData>;

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    @Inject('RoleRepository') private readonly roleRepository: IRoleRepository
  ) {}

  async execute(request: ICreateUserRequest): Promise<ICreateUserResponse> {
    try {
      this.logger.log(`Creating user with email: ${request.email} for org: ${request.orgId}`);

      // Verificar que el email no exista
      const existingUserByEmail = await this.userRepository.existsByEmail(
        request.email,
        request.orgId
      );
      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // Verificar que el username no exista
      const existingUserByUsername = await this.userRepository.existsByUsername(
        request.username,
        request.orgId
      );
      if (existingUserByUsername) {
        throw new ConflictException('User with this username already exists');
      }

      // Validar roles si se proporcionan
      if (request.roleIds && request.roleIds.length > 0) {
        for (const roleId of request.roleIds) {
          const role = await this.roleRepository.findById(roleId, request.orgId);
          if (!role) {
            throw new ConflictException(`Role with ID ${roleId} not found`);
          }
          if (!role.isActive) {
            throw new ConflictException(`Role with ID ${roleId} is not active`);
          }
        }
      }

      // El hash de la contraseña se maneja en la entidad User

      // Crear entidad de usuario
      const user = User.create(
        {
          email: Email.create(request.email),
          username: request.username,
          password: request.password,
          firstName: request.firstName,
          lastName: request.lastName,
          status: UserStatus.create(request.status || 'ACTIVE'),
          lastLoginAt: undefined,
          failedLoginAttempts: 0,
          lockedUntil: undefined,
          roles: [], // Se asignarán después
          permissions: [], // Se calcularán después
        },
        request.orgId
      );

      // Guardar usuario
      await this.userRepository.save(user);

      // Asignar roles si se proporcionan
      if (request.roleIds && request.roleIds.length > 0) {
        // TODO: Implementar asignación de roles
        // await this.assignRolesToUser(user.id, request.roleIds, request.orgId);
      }

      // Obtener usuario completo con roles y permisos
      const createdUser = await this.userRepository.findById(user.id, request.orgId);
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }

      this.logger.log(`User created successfully with ID: ${user.id}`);

      return {
        success: true,
        message: 'User created successfully',
        data: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          status: createdUser.status.toString(),
          roles: createdUser.roles || [],
          permissions: createdUser.permissions || [],
          createdAt: createdUser.createdAt.toISOString(),
          updatedAt: createdUser.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Create user use case failed:', error);
      throw error;
    }
  }
}
