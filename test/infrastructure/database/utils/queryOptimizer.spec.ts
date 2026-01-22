import {
  BatchOperations,
  FieldSelector,
  QueryPagination,
} from '@infrastructure/database/utils/queryOptimizer';
import { describe, expect, it } from '@jest/globals';

import type { IPaginationOptions } from '@infrastructure/database/utils/queryOptimizer';

describe('QueryOptimizer utilities', () => {
  describe('QueryPagination', () => {
    it('builds pagination from page/pageSize', () => {
      const result = QueryPagination.fromPage(2, 25);
      expect(result).toEqual({ skip: 25, take: 25 });
    });

    it('creates pagination options with cursor', () => {
      const result = QueryPagination.create({ cursor: 'cursor-1', take: 15 });
      expect(result).toEqual({ cursor: 'cursor-1', take: 15 });
    });

    it('creates pagination options with page', () => {
      const result = QueryPagination.create({ page: 3, pageSize: 10 });
      expect(result).toEqual({ skip: 20, take: 10 });
    });

    it('creates pagination options with skip/take', () => {
      const result = QueryPagination.create({ skip: 5, take: 7 });
      expect(result).toEqual({ skip: 5, take: 7 });
    });

    it('creates paginated result with cursor', () => {
      const options: IPaginationOptions = { skip: 0, take: 2 };
      const result = QueryPagination.createResult([{ id: 'a' }, { id: 'b' }], 4, options);

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('b');
      expect(result.total).toBe(4);
    });
  });

  describe('FieldSelector', () => {
    it('creates select map', () => {
      const result = FieldSelector.create(['id', 'name']);
      expect(result).toEqual({ id: true, name: true });
    });

    it('creates select map with relations', () => {
      const result = FieldSelector.createWithRelations(['id'], {
        lines: ['id', 'quantity'],
      });
      expect(result).toEqual({
        id: true,
        lines: { id: true, quantity: true },
      });
    });
  });

  describe('BatchOperations', () => {
    it('chunks arrays', () => {
      const result = BatchOperations.chunk([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('executes in batches', async () => {
      const operation = async (batch: number[]) => batch.map(value => value * 2);
      const result = await BatchOperations.executeInBatches([1, 2, 3, 4], 2, operation);
      expect(result).toEqual([2, 4, 6, 8]);
    });

    it('batchCreate delegates to executeInBatches', async () => {
      const operation = async (batch: number[]) => batch.map(value => value + 1);
      const result = await BatchOperations.batchCreate([1, 2], 1, operation);
      expect(result).toEqual([2, 3]);
    });

    it('batchUpdate delegates to executeInBatches', async () => {
      const operation = async (batch: number[]) => batch.map(value => value - 1);
      const result = await BatchOperations.batchUpdate([3, 4], 1, operation);
      expect(result).toEqual([2, 3]);
    });

    it('batchDelete aggregates results', async () => {
      const operation = async (batch: number[]) => batch.length;
      const result = await BatchOperations.batchDelete([1, 2, 3], 2, operation);
      expect(result).toBe(3);
    });
  });
});
