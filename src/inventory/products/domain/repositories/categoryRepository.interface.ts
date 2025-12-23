import { Category } from '@product/domain/entities/category.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface ICategoryRepository extends IReadRepository<Category>, IWriteRepository<Category> {
  findByName(name: string, orgId: string): Promise<Category | null>;
  findByParentId(parentId: string, orgId: string): Promise<Category[]>;
  findRootCategories(orgId: string): Promise<Category[]>;
  existsByName(name: string, orgId: string): Promise<boolean>;
}
