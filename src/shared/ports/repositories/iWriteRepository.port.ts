import { Entity } from '@shared/domain/base/entity.base';

/**
 * Write-only repository port interface
 * Output port following Hexagonal Architecture
 */
export interface IWriteRepository<T extends Entity<unknown>> {
  save(entity: T): Promise<T>;
  delete(id: string, orgId: string): Promise<void>;
}
