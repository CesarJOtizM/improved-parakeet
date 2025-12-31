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
    const requiredPermissions = this.reflector.getAllAndOverride<
      string[] | { type: 'ANY' | 'ALL'; permissions: string[] }
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verify user is authenticated
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Verify user has organization
    if (!user.orgId) {
      throw new ForbiddenException('User without assigned organization');
    }

    // Get user permissions from request (set by auth middleware)
    const userPermissions = request.userPermissions || [];
    const userRoles = request.userRoles || [];

    // Verify if user is super admin (has full access)
    if (userRoles.includes('ADMIN')) {
      return true;
    }

    // Verify required permissions
    const hasPermission = this.checkPermissions(requiredPermissions, userPermissions, userRoles);

    if (!hasPermission) {
      const permissionList =
        typeof requiredPermissions === 'object' && 'type' in requiredPermissions
          ? requiredPermissions.permissions.join(', ')
          : requiredPermissions.join(', ');

      throw new ForbiddenException(`Insufficient permissions. Required: ${permissionList}`);
    }

    return true;
  }

  private checkPermissions(
    requiredPermissions: string[] | { type: 'ANY' | 'ALL'; permissions: string[] },
    userPermissions: string[],
    _userRoles: string[]
  ): boolean {
    // If it's an object with specific type
    if (typeof requiredPermissions === 'object' && 'type' in requiredPermissions) {
      const { type, permissions } = requiredPermissions;

      switch (type) {
        case 'ANY':
          // At least one of the permissions
          return permissions.some(permission => userPermissions.includes(permission));
        case 'ALL':
          // All permissions
          return permissions.every(permission => userPermissions.includes(permission));
        default:
          return false;
      }
    }

    // By default, require all permissions
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
