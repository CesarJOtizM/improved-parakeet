import { Sale } from '@sale/domain/entities/sale.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Base specification that matches all sales in an org (for unfiltered paginated queries)
 */
export class SaleAllSpecification extends PrismaSpecification<Sale> {
  public isSatisfiedBy(): boolean {
    return true;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return { orgId };
  }
}

/**
 * Specification for sales by status
 */
export class SaleByStatusSpecification extends PrismaSpecification<Sale> {
  private readonly statuses: string[];

  constructor(status: string) {
    super();
    this.statuses = status.split(',').map(s => s.trim());
  }

  public isSatisfiedBy(sale: Sale): boolean {
    return this.statuses.includes(sale.status.getValue());
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      status: this.statuses.length === 1 ? this.statuses[0] : { in: this.statuses },
    };
  }
}

/**
 * Specification for sales by warehouse (supports comma-separated IDs)
 */
export class SaleByWarehouseSpecification extends PrismaSpecification<Sale> {
  private readonly warehouseIds: string[];

  constructor(warehouseId: string) {
    super();
    this.warehouseIds = warehouseId
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
  }

  public isSatisfiedBy(sale: Sale): boolean {
    return this.warehouseIds.includes(sale.warehouseId);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      warehouseId:
        this.warehouseIds.length === 1 ? this.warehouseIds[0] : { in: this.warehouseIds },
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
 * Specification for free-text search on saleNumber, customerReference, or externalReference
 */
export class SaleBySearchSpecification extends PrismaSpecification<Sale> {
  private readonly term: string;

  constructor(search: string) {
    super();
    this.term = search.trim().toLowerCase();
  }

  public isSatisfiedBy(sale: Sale): boolean {
    const saleNumber = (sale.saleNumber?.getValue() || '').toLowerCase();
    const customerRef = (sale.customerReference || '').toLowerCase();
    return saleNumber.includes(this.term) || customerRef.includes(this.term);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      OR: [
        { saleNumber: { contains: this.term, mode: 'insensitive' } },
        { customerReference: { contains: this.term, mode: 'insensitive' } },
        { externalReference: { contains: this.term, mode: 'insensitive' } },
      ],
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
