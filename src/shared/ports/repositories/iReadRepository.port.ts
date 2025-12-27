import { Entity } from '@shared/domain/base/entity.base';

/**
 * Read-only repository port interface
 * Output port following Hexagonal Architecture
 */
export interface IReadRepository<T extends Entity<unknown>> {
  findById(id: string, orgId: string): Promise<T | null>;
  findAll(orgId: string): Promise<T[]>;
  exists(id: string, orgId: string): Promise<boolean>;
}
