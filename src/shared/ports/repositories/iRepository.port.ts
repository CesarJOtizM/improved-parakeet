import { Entity } from '@shared/domain/base/entity.base';

/**
 * Base repository port interface for full CRUD operations
 * Output port following Hexagonal Architecture
 */
export interface IRepository<T extends Entity<unknown>> {
  findById(id: string, orgId: string): Promise<T | null>;
  findAll(orgId: string): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string, orgId: string): Promise<void>;
  exists(id: string, orgId: string): Promise<boolean>;
}
