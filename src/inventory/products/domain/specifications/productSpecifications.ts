import { Product } from '@product/domain/entities/product.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Specification for products by status
 */
export class ProductByStatusSpecification extends PrismaSpecification<Product> {
  constructor(private readonly status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED') {
    super();
  }

  public isSatisfiedBy(product: Product): boolean {
    return product.status.getValue() === this.status;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    const isActive = this.status === 'ACTIVE';
    return {
      orgId,
      isActive,
    };
  }
}

/**
 * Specification for products by warehouse (via stock)
 * Note: This requires a join with stock table, so it's more complex
 * For now, we'll use a simple filter that can be combined with stock queries
 */
export class ProductByWarehouseSpecification extends PrismaSpecification<Product> {
  constructor(private readonly warehouseId: string) {
    super();
  }

  public isSatisfiedBy(_product: Product): boolean {
    // This cannot be determined from Product alone, requires stock check
    // Return true to allow composition with other specifications
    return true;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    // This requires a join with stock table
    // For now, return base where clause - repository will need to handle the join
    return {
      orgId,
      stock: {
        some: {
          warehouseId: this.warehouseId,
          orgId,
        },
      },
    };
  }
}

/**
 * Specification for products with low stock
 * Note: This requires stock calculation, so it's handled at repository level
 */
export class ProductLowStockSpecification extends PrismaSpecification<Product> {
  constructor(private readonly threshold: number = 0) {
    super();
  }

  public isSatisfiedBy(_product: Product): boolean {
    // Cannot determine from Product alone, requires stock calculation
    return true;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    // This requires aggregation on stock table
    // Repository will need to handle this with a custom query
    // Threshold value is available via this.threshold if needed
    void this.threshold; // Acknowledge threshold parameter for future use
    return {
      orgId,
      // Note: Actual low stock filtering happens at repository level
    };
  }
}

/**
 * Specification for products created within a date range
 */
export class ProductByDateRangeSpecification extends PrismaSpecification<Product> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    super();
  }

  public isSatisfiedBy(product: Product): boolean {
    const createdAt = product.createdAt;
    return createdAt >= this.startDate && createdAt <= this.endDate;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      createdAt: {
        gte: this.startDate,
        lte: this.endDate,
      },
    };
  }
}

/**
 * Specification for products by category
 */
export class ProductByCategorySpecification extends PrismaSpecification<Product> {
  constructor(private readonly category: string) {
    super();
  }

  public isSatisfiedBy(_product: Product): boolean {
    return true;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      categories: { some: { id: this.category } },
    };
  }
}

/**
 * Specification for products by multiple categories (OR logic)
 */
export class ProductByCategoriesSpecification extends PrismaSpecification<Product> {
  constructor(private readonly categoryIds: string[]) {
    super();
  }

  public isSatisfiedBy(_product: Product): boolean {
    return true;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      categories: { some: { id: { in: this.categoryIds } } },
    };
  }
}

/**
 * Specification for products by company
 */
export class ProductByCompanySpecification extends PrismaSpecification<Product> {
  constructor(private readonly companyId: string) {
    super();
  }

  public isSatisfiedBy(product: Product): boolean {
    return product.companyId === this.companyId;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      companyId: this.companyId,
    };
  }
}
