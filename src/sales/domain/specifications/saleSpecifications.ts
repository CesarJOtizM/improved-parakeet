import { Sale } from '@sale/domain/entities/sale.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Specification for sales by status
 */
export class SaleByStatusSpecification extends PrismaSpecification<Sale> {
  constructor(private readonly status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED') {
    super();
  }

  public isSatisfiedBy(sale: Sale): boolean {
    return sale.status.getValue() === this.status;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      status: this.status,
    };
  }
}

/**
 * Specification for sales by warehouse
 */
export class SaleByWarehouseSpecification extends PrismaSpecification<Sale> {
  constructor(private readonly warehouseId: string) {
    super();
  }

  public isSatisfiedBy(sale: Sale): boolean {
    return sale.warehouseId === this.warehouseId;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      warehouseId: this.warehouseId,
    };
  }
}

/**
 * Specification for sales created within a date range
 */
export class SaleByDateRangeSpecification extends PrismaSpecification<Sale> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    super();
  }

  public isSatisfiedBy(sale: Sale): boolean {
    const createdAt = sale.createdAt;
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
 * Specification for sales by customer reference
 */
export class SaleByCustomerSpecification extends PrismaSpecification<Sale> {
  constructor(private readonly customerReference: string) {
    super();
  }

  public isSatisfiedBy(sale: Sale): boolean {
    return sale.customerReference === this.customerReference;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      customerReference: this.customerReference,
    };
  }
}
