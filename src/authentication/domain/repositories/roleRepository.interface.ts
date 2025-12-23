import { Role } from '@auth/domain/entities/role.entity';
import { IWriteRepository } from '@shared/domain/repository';

export interface IRoleRepository extends IWriteRepository<Role> {
  // Override IReadRepository methods to make orgId optional for roles
  findById(id: string, orgId?: string): Promise<Role | null>;
  findAll(orgId: string): Promise<Role[]>;
  exists(id: string, orgId?: string): Promise<boolean>;

  findByName(name: string, orgId?: string): Promise<Role | null>;
  findByStatus(isActive: boolean, orgId: string): Promise<Role[]>;
  findActiveRoles(orgId: string): Promise<Role[]>;
  findRolesByUser(userId: string, orgId: string): Promise<Role[]>;
  existsByName(name: string, orgId?: string): Promise<boolean>;
  countByStatus(isActive: boolean, orgId: string): Promise<number>;
  findRolesWithPermissions(permissionIds: string[], orgId: string): Promise<Role[]>;

  // New methods for system and custom roles
  findSystemRoles(): Promise<Role[]>;
  findCustomRoles(orgId: string): Promise<Role[]>;
  findAvailableRolesForOrganization(orgId: string): Promise<Role[]>;
}
