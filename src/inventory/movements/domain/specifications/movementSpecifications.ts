import { Movement } from '@movement/domain/entities/movement.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Specification for movements by status
 */
export class MovementByStatusSpecification extends PrismaSpecification<Movement> {
  private readonly statuses: string[];

  constructor(status: string) {
    super();
    this.statuses = status.split(',').map(s => s.trim());
  }

  public isSatisfiedBy(movement: Movement): boolean {
    return this.statuses.includes(movement.status.getValue());
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      status: this.statuses.length === 1 ? this.statuses[0] : { in: this.statuses },
    };
  }
}

/**
 * Specification for movements by type
 */
export class MovementByTypeSpecification extends PrismaSpecification<Movement> {
  constructor(
    private readonly type:
      | 'IN'
      | 'OUT'
      | 'ADJUST_IN'
      | 'ADJUST_OUT'
      | 'TRANSFER_OUT'
      | 'TRANSFER_IN'
  ) {
    super();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    return movement.type.getValue() === this.type;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      type: this.type,
    };
  }
}

/**
 * Specification for movements by warehouse
 */
export class MovementByWarehouseSpecification extends PrismaSpecification<Movement> {
  constructor(private readonly warehouseId: string) {
    super();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    return movement.warehouseId === this.warehouseId;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      warehouseId: this.warehouseId,
    };
  }
}

/**
 * Specification for movements created within a date range
 */
export class MovementByDateRangeSpecification extends PrismaSpecification<Movement> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    super();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    const createdAt = movement.createdAt;
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
 * Specification for movements filtered by product company ID (via movement lines)
 */
export class MovementByCompanySpecification extends PrismaSpecification<Movement> {
  constructor(private readonly companyId: string) {
    super();
  }

  public isSatisfiedBy(): boolean {
    return true; // Cannot check in-memory without loaded product relations
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      lines: {
        some: {
          product: { companyId: this.companyId },
        },
      },
    };
  }
}

/**
 * Specification for movements by search term (reference, reason, note)
 */
export class MovementBySearchSpecification extends PrismaSpecification<Movement> {
  private readonly searchTerm: string;

  constructor(search: string) {
    super();
    this.searchTerm = search.trim().toLowerCase();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    const term = this.searchTerm;
    return (
      (movement.reference?.toLowerCase().includes(term) ?? false) ||
      (movement.reason?.toLowerCase().includes(term) ?? false) ||
      (movement.note?.toLowerCase().includes(term) ?? false)
    );
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      OR: [
        { reference: { contains: this.searchTerm, mode: 'insensitive' } },
        { reason: { contains: this.searchTerm, mode: 'insensitive' } },
        { notes: { contains: this.searchTerm, mode: 'insensitive' } },
      ],
    };
  }
}

/**
 * Specification for movements by product (via movement lines)
 */
export class MovementByProductSpecification extends PrismaSpecification<Movement> {
  constructor(private readonly productId: string) {
    super();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    return movement.getLines().some(line => line.productId === this.productId);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      lines: {
        some: {
          productId: this.productId,
          orgId,
        },
      },
    };
  }
}
