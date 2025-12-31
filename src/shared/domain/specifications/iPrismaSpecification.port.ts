import { ISpecification } from './iSpecification.port';

/**
 * Prisma Where Input type (from Prisma client)
 * Represents a Prisma where clause for database queries
 */
export type PrismaWhereInput = Record<string, unknown>;

/**
 * Specification that can be converted to a Prisma where clause
 *
 * Extends ISpecification to support both in-memory evaluation
 * and database query generation for performance optimization.
 */
export interface IPrismaSpecification<T> extends ISpecification<T> {
  /**
   * Converts this specification to a Prisma where clause
   * @param orgId The organization ID to include in the where clause
   * @returns A Prisma where input object that can be used in queries
   */
  toPrismaWhere(orgId: string): PrismaWhereInput;
}
