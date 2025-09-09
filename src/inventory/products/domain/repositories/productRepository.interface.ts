import { Product } from '@product/domain/entities/product.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IProductRepository extends IReadRepository<Product>, IWriteRepository<Product> {
  findBySku(sku: string, orgId: string): Promise<Product | null>;
  findByCategory(categoryId: string, orgId: string): Promise<Product[]>;
  findByStatus(status: string, orgId: string): Promise<Product[]>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Product[]>;
  findLowStock(orgId: string): Promise<Product[]>;
  existsBySku(sku: string, orgId: string): Promise<boolean>;
}
