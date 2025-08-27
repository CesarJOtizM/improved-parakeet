import { Entity } from '@shared/domain/base/entity.base';

export interface ReadRepository<T extends Entity<unknown>> {
  findById(id: string, orgId: string): Promise<T | null>;
  findAll(orgId: string): Promise<T[]>;
  exists(id: string, orgId: string): Promise<boolean>;
}
