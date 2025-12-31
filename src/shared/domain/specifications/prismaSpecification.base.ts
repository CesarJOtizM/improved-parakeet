import { BaseSpecification } from './baseSpecification';
import { IPrismaSpecification, PrismaWhereInput } from './iPrismaSpecification.port';

/**
 * Base class for Prisma specifications
 * Provides default implementations for composite operations with Prisma where clause conversion
 */
export abstract class PrismaSpecification<T>
  extends BaseSpecification<T>
  implements IPrismaSpecification<T>
{
  /**
   * Converts this specification to a Prisma where clause
   * Must be implemented by concrete specifications
   */
  public abstract toPrismaWhere(orgId: string): PrismaWhereInput;

  /**
   * Combines this specification with another using AND logic
   * Returns a composite specification that also supports Prisma conversion
   */
  public and(spec: IPrismaSpecification<T>): IPrismaSpecification<T> {
    return new PrismaAndSpecification(this, spec);
  }

  /**
   * Combines this specification with another using OR logic
   * Returns a composite specification that also supports Prisma conversion
   */
  public or(spec: IPrismaSpecification<T>): IPrismaSpecification<T> {
    return new PrismaOrSpecification(this, spec);
  }

  /**
   * Negates this specification using NOT logic
   * Returns a composite specification that also supports Prisma conversion
   */
  public not(): IPrismaSpecification<T> {
    return new PrismaNotSpecification(this);
  }
}

/**
 * Composite Prisma specification that combines two specifications with AND logic
 */
export class PrismaAndSpecification<T> extends PrismaSpecification<T> {
  constructor(
    private readonly spec1: IPrismaSpecification<T>,
    private readonly spec2: IPrismaSpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return this.spec1.isSatisfiedBy(entity) && this.spec2.isSatisfiedBy(entity);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    const where1 = this.spec1.toPrismaWhere(orgId);
    const where2 = this.spec2.toPrismaWhere(orgId);

    // Merge where clauses with AND logic
    // If both have the same keys, we need to combine them properly
    return {
      AND: [where1, where2],
    };
  }
}

/**
 * Composite Prisma specification that combines two specifications with OR logic
 */
export class PrismaOrSpecification<T> extends PrismaSpecification<T> {
  constructor(
    private readonly spec1: IPrismaSpecification<T>,
    private readonly spec2: IPrismaSpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return this.spec1.isSatisfiedBy(entity) || this.spec2.isSatisfiedBy(entity);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    const where1 = this.spec1.toPrismaWhere(orgId);
    const where2 = this.spec2.toPrismaWhere(orgId);

    return {
      OR: [where1, where2],
    };
  }
}

/**
 * Composite Prisma specification that negates another specification
 */
export class PrismaNotSpecification<T> extends PrismaSpecification<T> {
  constructor(private readonly spec: IPrismaSpecification<T>) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return !this.spec.isSatisfiedBy(entity);
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    const where = this.spec.toPrismaWhere(orgId);

    return {
      NOT: where,
    };
  }
}
