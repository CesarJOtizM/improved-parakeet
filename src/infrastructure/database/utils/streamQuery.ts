// Query Streaming Utilities
// Provides cursor-based pagination for large result sets

import { IPaginatedResult } from './queryOptimizer';

export interface IStreamQueryOptions {
  batchSize?: number;
  cursor?: string;
}

export interface IStreamQueryResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Stream query results using cursor-based pagination
 * Useful for processing large result sets without loading everything into memory
 */
export class StreamQuery {
  /**
   * Stream query results with cursor-based pagination
   * @param queryFn Function that executes the query with cursor and take parameters
   * @param options Streaming options
   * @param onBatch Callback function called for each batch of results
   */
  static async stream<T>(
    queryFn: (
      cursor: string | undefined,
      take: number
    ) => Promise<{ items: T[]; hasMore: boolean }>,
    options: IStreamQueryOptions = {},
    onBatch?: (batch: T[], cursor?: string) => Promise<void> | void
  ): Promise<void> {
    const batchSize = options.batchSize || 100;
    let cursor: string | undefined = options.cursor;
    let hasMore = true;

    while (hasMore) {
      const result = await queryFn(cursor, batchSize);
      const { items, hasMore: more } = result;

      if (onBatch) {
        await onBatch(items, cursor);
      }

      hasMore = more;
      cursor = items.length > 0 ? (items[items.length - 1] as { id: string }).id : undefined;
    }
  }

  /**
   * Stream query results and collect all items
   * Use with caution for very large datasets - prefer stream() with onBatch callback
   */
  static async streamAll<T>(
    queryFn: (
      cursor: string | undefined,
      take: number
    ) => Promise<{ items: T[]; hasMore: boolean }>,
    options: IStreamQueryOptions = {}
  ): Promise<T[]> {
    const allItems: T[] = [];

    await this.stream(queryFn, options, async (batch: T[]) => {
      allItems.push(...batch);
    });

    return allItems;
  }

  /**
   * Create a query function for Prisma findMany with cursor
   */
  static createPrismaQuery<T extends { id: string }>(
    prismaQuery: (args: { cursor?: { id: string }; take: number; skip?: number }) => Promise<T[]>
  ): (cursor: string | undefined, take: number) => Promise<{ items: T[]; hasMore: boolean }> {
    return async (cursor: string | undefined, take: number) => {
      const args: { cursor?: { id: string }; take: number; skip?: number } = {
        take: take + 1, // Fetch one extra to check if there are more
      };

      if (cursor) {
        args.cursor = { id: cursor };
      }

      const items = await prismaQuery(args);
      const hasMore = items.length > take;

      return {
        items: hasMore ? items.slice(0, take) : items,
        hasMore,
      };
    };
  }

  /**
   * Transform stream result to paginated result format
   */
  static toPaginatedResult<T extends { id: string }>(
    items: T[],
    batchSize: number,
    _cursor?: string
  ): IPaginatedResult<T> {
    const hasMore = items.length === batchSize;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

    return {
      data: items,
      total: items.length, // Note: total is approximate for streaming
      hasMore,
      nextCursor,
    };
  }
}
