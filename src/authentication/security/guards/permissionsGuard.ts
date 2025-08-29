import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '@shared/types/http.types';
import { Request } from 'express';

export interface PermissionGuardOptions {
  requireAll?: boolean; // true = requiere todos los permisos, false = requiere al menos uno
  permissions?: string[];
  roles?: string[];
  checkOrganization?: boolean; // verificar que el usuario pertenezca a la organización
}

export type { AuthenticatedUser } from '@auth/types/http.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.getGuardOptions(context);

    // Si no hay restricciones de permisos, permitir acceso
    if (!options.permissions?.length && !options.roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.error('User not found in request context');
      throw new ForbiddenException('User authentication required');
    }

    try {
      // Verificar organización si está habilitado
      if (options.checkOrganization) {
        if (!this.checkOrganizationAccess(request, user)) {
          throw new ForbiddenException('Access denied to this organization');
        }
      }

      // Verificar roles si están especificados
      if (options.roles?.length) {
        if (!this.checkRoles(user.roles, options.roles, options.requireAll || false)) {
          throw new ForbiddenException('Insufficient role permissions');
        }
      }

      // Verificar permisos si están especificados
      if (options.permissions?.length) {
        if (
          !this.checkPermissions(user.permissions, options.permissions, options.requireAll || false)
        ) {
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Permission check failed:', error);
      throw new ForbiddenException('Permission verification failed');
    }
  }

  private getGuardOptions(context: ExecutionContext): PermissionGuardOptions {
    const options = this.reflector.get<PermissionGuardOptions>(
      'permissionOptions',
      context.getHandler()
    );

    return {
      requireAll: false,
      permissions: [],
      roles: [],
      checkOrganization: true,
      ...options,
    };
  }

  private checkOrganizationAccess(request: Request, user: AuthenticatedUser): boolean {
    // Verificar si el usuario está intentando acceder a recursos de su organización
    const requestOrgId = this.extractOrganizationId(request);

    if (requestOrgId && requestOrgId !== user.orgId) {
      this.logger.warn(
        `User ${user.id} attempted to access organization ${requestOrgId} but belongs to ${user.orgId}`
      );
      return false;
    }

    return true;
  }

  private extractOrganizationId(request: Request): string | null {
    // Extraer orgId de diferentes fuentes posibles
    return (
      request.params?.orgId ||
      request.query?.orgId ||
      request.body?.orgId ||
      request.headers['x-organization-id'] ||
      null
    );
  }

  private checkRoles(userRoles: string[], requiredRoles: string[], requireAll: boolean): boolean {
    if (!userRoles?.length || !requiredRoles?.length) {
      return false;
    }

    if (requireAll) {
      // Requiere todos los roles
      return requiredRoles.every(role => userRoles.includes(role));
    } else {
      // Requiere al menos uno de los roles
      return requiredRoles.some(role => userRoles.includes(role));
    }
  }

  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    requireAll: boolean
  ): boolean {
    if (!userPermissions?.length || !requiredPermissions?.length) {
      return false;
    }

    if (requireAll) {
      // Requiere todos los permisos
      return requiredPermissions.every(permission => userPermissions.includes(permission));
    } else {
      // Requiere al menos uno de los permisos
      return requiredPermissions.some(permission => userPermissions.includes(permission));
    }
  }
}
