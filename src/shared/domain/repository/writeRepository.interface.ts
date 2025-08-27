import { Entity } from '@shared/domain/base/entity.base';

export interface WriteRepository<T extends Entity<unknown>> {
  save(entity: T): Promise<T>;
  delete(id: string, orgId: string): Promise<void>;
}
