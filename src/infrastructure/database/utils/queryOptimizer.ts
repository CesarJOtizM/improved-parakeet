// Query Optimization Utilities
// Provides utilities for pagination, field selection, and batch operations

export interface IPaginationOptions {
  skip?: number;
  take?: number;
  cursor?: string;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Pagination helper for Prisma queries
 */
export class QueryPagination {
  /**
   * Calculate skip and take from page and pageSize
   */
  static fromPage(page: number, pageSize: number): { skip: number; take: number } {
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    return { skip, take };
  }

  /**
   * Create pagination options for Prisma
   */
  static create(options: {
    page?: number;
    pageSize?: number;
    skip?: number;
    take?: number;
    cursor?: string;
  }): IPaginationOptions {
    if (options.cursor) {
      return { cursor: options.cursor, take: options.take || options.pageSize || 20 };
    }

    if (options.page && options.pageSize) {
      const { skip, take } = this.fromPage(options.page, options.pageSize);
      return { skip, take };
    }

    return {
      skip: options.skip,
      take: options.take || options.pageSize,
    };
  }

  /**
   * Create paginated result
   */
  static createResult<T>(
    data: T[],
    total: number,
    options: IPaginationOptions
  ): IPaginatedResult<T> {
    const hasMore = options.take
      ? data.length === options.take && total > (options.skip || 0) + data.length
      : false;
    const nextCursor =
      hasMore && data.length > 0 ? (data[data.length - 1] as { id: string }).id : undefined;

    return {
      data,
      total,
      hasMore,
      nextCursor,
    };
  }
}

/**
 * Field selection builder for Prisma queries
 */
export class FieldSelector {
  /**
   * Create select object for Prisma query
   */
  static create<T extends string>(fields: T[]): Record<T, boolean> {
    return fields.reduce(
      (acc, field) => {
        acc[field] = true;
        return acc;
      },
      {} as Record<T, boolean>
    );
  }

  /**
   * Create select object with nested relations
   */
  static createWithRelations<T extends string>(
    fields: T[],
    relations?: Record<string, string[]>
  ): Record<string, boolean | Record<string, boolean>> {
    const select: Record<string, boolean | Record<string, boolean>> = {};

    fields.forEach(field => {
      select[field] = true;
    });

    if (relations) {
      Object.entries(relations).forEach(([relation, relationFields]) => {
        select[relation] = FieldSelector.create(relationFields as T[]);
      });
    }

    return select;
  }
}

/**
 * Batch operation utilities
 */
export class BatchOperations {
  /**
   * Split array into chunks of specified size
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Execute batch operations with size limit
   */
  static async executeInBatches<T, R>(
    items: T[],
    batchSize: number,
    operation: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const chunks = this.chunk(items, batchSize);
    const results: R[] = [];

    for (const chunk of chunks) {
      const batchResults = await operation(chunk);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch create operation for Prisma
   */
  static async batchCreate<T, R>(
    items: T[],
    batchSize: number,
    createOperation: (data: T[]) => Promise<R[]>
  ): Promise<R[]> {
    return this.executeInBatches(items, batchSize, createOperation);
  }

  /**
   * Batch update operation for Prisma
   */
  static async batchUpdate<T, R>(
    items: T[],
    batchSize: number,
    updateOperation: (data: T[]) => Promise<R[]>
  ): Promise<R[]> {
    return this.executeInBatches(items, batchSize, updateOperation);
  }

  /**
   * Batch delete operation for Prisma
   */
  static async batchDelete<T>(
    items: T[],
    batchSize: number,
    deleteOperation: (data: T[]) => Promise<number>
  ): Promise<number> {
    const chunks = this.chunk(items, batchSize);
    let totalDeleted = 0;

    for (const chunk of chunks) {
      const deleted = await deleteOperation(chunk);
      totalDeleted += deleted;
    }

    return totalDeleted;
  }

  /**
   * Default batch size for Prisma operations
   */
  static readonly DEFAULT_BATCH_SIZE = 1000;
}
