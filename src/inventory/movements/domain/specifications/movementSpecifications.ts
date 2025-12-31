import { Movement } from '@movement/domain/entities/movement.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Specification for movements by status
 */
export class MovementByStatusSpecification extends PrismaSpecification<Movement> {
  constructor(private readonly status: 'DRAFT' | 'POSTED' | 'VOID') {
    super();
  }

  public isSatisfiedBy(movement: Movement): boolean {
    return movement.status.getValue() === this.status;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId,
      status: this.status,
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
