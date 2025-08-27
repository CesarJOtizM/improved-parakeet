import { ReadRepository, WriteRepository } from '@shared/domain/repository';
import { Product } from '../entities/product.entity';

export interface ProductRepository extends ReadRepository<Product>, WriteRepository<Product> {
  findBySku(sku: string, orgId: string): Promise<Product | null>;
  findByCategory(categoryId: string, orgId: string): Promise<Product[]>;
  findByStatus(status: string, orgId: string): Promise<Product[]>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Product[]>;
  findLowStock(orgId: string): Promise<Product[]>;
  existsBySku(sku: string, orgId: string): Promise<boolean>;
}
