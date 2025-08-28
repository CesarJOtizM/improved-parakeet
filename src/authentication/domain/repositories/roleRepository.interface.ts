import { Role } from '@auth/domain/entities/role.entity';
import { ReadRepository, WriteRepository } from '@shared/domain/repository';

export interface RoleRepository extends ReadRepository<Role>, WriteRepository<Role> {
  findByName(name: string, orgId: string): Promise<Role | null>;
  findByStatus(isActive: boolean, orgId: string): Promise<Role[]>;
  findActiveRoles(orgId: string): Promise<Role[]>;
  findRolesByUser(userId: string, orgId: string): Promise<Role[]>;
  existsByName(name: string, orgId: string): Promise<boolean>;
  countByStatus(isActive: boolean, orgId: string): Promise<number>;
  findRolesWithPermissions(permissionIds: string[], orgId: string): Promise<Role[]>;
}
