import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Product } from '@product/domain/entities/product.entity';
import { IPrismaSpecification } from '@shared/domain/specifications';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

/**
 * Product repository port interface
 * Output port for product persistence following Hexagonal Architecture
 */
export interface IProductRepository extends IReadRepository<Product>, IWriteRepository<Product> {
  findBySku(sku: string, orgId: string): Promise<Product | null>;
  findByCategory(categoryId: string, orgId: string): Promise<Product[]>;
  findByStatus(status: string, orgId: string): Promise<Product[]>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Product[]>;
  findLowStock(orgId: string): Promise<Product[]>;
  existsBySku(sku: string, orgId: string): Promise<boolean>;
  findBySpecification(
    spec: IPrismaSpecification<Product>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Product>>;
}
