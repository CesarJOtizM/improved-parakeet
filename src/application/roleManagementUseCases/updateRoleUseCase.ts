import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IRoleData } from './types';
import type { IRoleRepository } from '@auth/domain/repositories';

export interface IUpdateRoleRequest {
  roleId: string;
  orgId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export type IUpdateRoleResponse = IApiResponseSuccess<IRoleData>;

@Injectable()
export class UpdateRoleUseCase {
  private readonly logger = new Logger(UpdateRoleUseCase.name);

  constructor(@Inject('RoleRepository') private readonly roleRepository: IRoleRepository) {}

  async execute(request: IUpdateRoleRequest): Promise<IUpdateRoleResponse> {
    try {
      this.logger.log(`Updating role with ID: ${request.roleId} for org: ${request.orgId}`);

      // Buscar rol existente
      const existingRole = await this.roleRepository.findById(request.roleId, request.orgId);
      if (!existingRole) {
        throw new NotFoundException('Role not found');
      }

      // Verificar que el nombre no esté en uso por otro rol
      if (request.name && request.name !== existingRole.name) {
        const nameExists = await this.roleRepository.findByName(request.name, request.orgId);
        if (nameExists) {
          throw new ConflictException('Role with this name already exists');
        }
      }

      // Actualizar propiedades del rol
      const updateData: Partial<{
        name: string;
        description: string | undefined;
        isActive: boolean;
      }> = {};
      if (request.name) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.isActive !== undefined) updateData.isActive = request.isActive;

      // Aplicar actualizaciones
      existingRole.update(updateData);

      // Guardar cambios
      await this.roleRepository.save(existingRole);

      this.logger.log(`Role updated successfully with ID: ${request.roleId}`);

      return {
        success: true,
        message: 'Role updated successfully',
        data: {
          id: existingRole.id,
          name: existingRole.name,
          description: existingRole.description,
          isActive: existingRole.isActive,
          createdAt: existingRole.createdAt.toISOString(),
          updatedAt: existingRole.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error('Update role use case failed:', error);
      throw error;
    }
  }
}
