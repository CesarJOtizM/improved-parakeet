import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthenticatedUser } from '@shared/types/http.types';
import { Request } from 'express';

export interface IRoleBasedAuthOptions {
  requiredRoles: string[];
  requireAllRoles: boolean; // true = requiere todos los roles, false = requiere al menos uno
  checkOrganization: boolean;
  allowSuperAdmin: boolean; // Permitir acceso a super administradores
}

@Injectable()
export class RoleBasedAuthGuard implements CanActivate {
  private readonly logger = new Logger(RoleBasedAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.getGuardOptions(context);

    // Si no hay roles requeridos, permitir acceso
    if (!options.requiredRoles?.length) {
      this.logger.debug('No roles required, access granted');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as IAuthenticatedUser | undefined;

    if (!user) {
      this.logger.error('User not found in request context');
      throw new ForbiddenException('User authentication required');
    }

    try {
      // Verificar organización si está habilitado
      if (options.checkOrganization) {
        if (!this.checkOrganizationAccess(request, user)) {
          this.logger.warn(
            `User ${user.id} attempted to access organization ${this.extractOrganizationId(request)} but belongs to ${user.orgId}`
          );
          throw new ForbiddenException('Access denied to this organization');
        }
      }

      // Verificar si es super administrador
      if (options.allowSuperAdmin && this.isSuperAdmin(user)) {
        this.logger.debug(`Super admin access granted for user ${user.id}`);
        return true;
      }

      // Verificar roles
      const hasRequiredRoles = this.checkRoles(
        user.roles,
        options.requiredRoles,
        options.requireAllRoles
      );

      if (!hasRequiredRoles) {
        this.logger.warn(
          `User ${user.id} with roles [${user.roles.join(', ')}] attempted to access endpoint requiring roles [${options.requiredRoles.join(', ')}]`
        );
        throw new ForbiddenException('Insufficient role permissions');
      }

      this.logger.debug(
        `Role-based access granted for user ${user.id} with roles [${user.roles.join(', ')}]`
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Role-based authorization check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
      });
      throw new ForbiddenException('Role verification failed');
    }
  }

  private getGuardOptions(context: ExecutionContext): IRoleBasedAuthOptions {
    const options = this.reflector.get<IRoleBasedAuthOptions>(
      'roleBasedAuthOptions',
      context.getHandler()
    );

    return {
      ...options,
      requiredRoles: options?.requiredRoles || [],
      requireAllRoles: options?.requireAllRoles || false,
      checkOrganization: options?.checkOrganization ?? true,
      allowSuperAdmin: options?.allowSuperAdmin ?? true,
    };
  }

  private checkRoles(userRoles: string[], requiredRoles: string[], requireAll: boolean): boolean {
    if (requireAll) {
      return requiredRoles.every(role => userRoles.includes(role));
    }
    return requiredRoles.some(role => userRoles.includes(role));
  }

  private checkOrganizationAccess(request: Request, user: IAuthenticatedUser): boolean {
    const requestOrgId = this.extractOrganizationId(request);

    if (!requestOrgId) {
      return true; // Si no hay orgId en la request, permitir acceso
    }

    return requestOrgId === user.orgId;
  }

  private extractOrganizationId(request: Request): string | null {
    // Extraer orgId de diferentes fuentes posibles
    const orgId =
      request.params.orgId ||
      request.query.orgId ||
      request.body?.orgId ||
      request.headers['x-organization-id'];

    return orgId ? String(orgId) : null;
  }

  private isSuperAdmin(user: IAuthenticatedUser): boolean {
    return user.roles.includes('SUPER_ADMIN') || user.roles.includes('SYSTEM_ADMIN');
  }
}
