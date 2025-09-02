import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@shared/decorators/requirePermissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay permisos requeridos, permitir acceso
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario esté autenticado
    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Verificar que el usuario tenga la organización
    if (!user.orgId) {
      throw new ForbiddenException('Usuario sin organización asignada');
    }

    // Obtener permisos del usuario desde el request (seteado por el middleware de auth)
    const userPermissions = request.userPermissions || [];
    const userRoles = request.userRoles || [];

    // Verificar si es un super admin (tiene acceso total)
    if (userRoles.includes('ADMIN')) {
      return true;
    }

    // Verificar permisos requeridos
    const hasPermission = this.checkPermissions(requiredPermissions, userPermissions, userRoles);

    if (!hasPermission) {
      const permissionList =
        typeof requiredPermissions === 'object' && 'type' in requiredPermissions
          ? requiredPermissions.permissions.join(', ')
          : requiredPermissions.join(', ');

      throw new ForbiddenException(`Permisos insuficientes. Requeridos: ${permissionList}`);
    }

    return true;
  }

  private checkPermissions(
    requiredPermissions: string[] | { type: 'ANY' | 'ALL'; permissions: string[] },
    userPermissions: string[],
    _userRoles: string[]
  ): boolean {
    // Si es un objeto con tipo específico
    if (typeof requiredPermissions === 'object' && 'type' in requiredPermissions) {
      const { type, permissions } = requiredPermissions;

      switch (type) {
        case 'ANY':
          // Al menos uno de los permisos
          return permissions.some(permission => userPermissions.includes(permission));
        case 'ALL':
          // Todos los permisos
          return permissions.every(permission => userPermissions.includes(permission));
        default:
          return false;
      }
    }

    // Por defecto, requerir todos los permisos
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
