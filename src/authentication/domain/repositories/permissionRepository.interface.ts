import { Permission } from '@auth/domain/entities/permission.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IPermissionRepository
  extends IReadRepository<Permission>,
    IWriteRepository<Permission> {
  findByName(name: string): Promise<Permission | null>;
  findByModule(module: string): Promise<Permission[]>;
  findByAction(action: string): Promise<Permission[]>;
  findByModuleAndAction(module: string, action: string): Promise<Permission[]>;
  findPermissionsByRole(roleId: string): Promise<Permission[]>;
  findPermissionsByUser(userId: string, orgId: string): Promise<Permission[]>;
  findSystemPermissions(): Promise<Permission[]>;
  findCustomPermissions(orgId: string): Promise<Permission[]>;
  existsByName(name: string): Promise<boolean>;
  countByModule(module: string): Promise<number>;
  findPermissionsByModules(modules: string[]): Promise<Permission[]>;
}
