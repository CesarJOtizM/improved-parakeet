import { StreamQuery } from '@infrastructure/database/utils/streamQuery';

describe('StreamQuery', () => {
  describe('stream', () => {
    it('Given: two batches When: streaming Then: should call onBatch with correct cursors', async () => {
      // Arrange
      const batches = [
        { items: [{ id: 'a' }, { id: 'b' }], hasMore: true },
        { items: [{ id: 'c' }], hasMore: false },
      ];
      const queryFn = jest.fn().mockImplementation(() => Promise.resolve(batches.shift()));
      const onBatch = jest.fn();

      // Act
      await StreamQuery.stream(queryFn, { batchSize: 2 }, onBatch);

      // Assert
      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(onBatch).toHaveBeenCalledTimes(2);
      expect(onBatch).toHaveBeenNthCalledWith(1, [{ id: 'a' }, { id: 'b' }], undefined);
      expect(onBatch).toHaveBeenNthCalledWith(2, [{ id: 'c' }], 'b');
    });

    it('Given: empty batch When: streaming Then: should finish with undefined cursor', async () => {
      // Arrange
      const queryFn = jest.fn().mockResolvedValue({ items: [], hasMore: false });
      const onBatch = jest.fn();

      // Act
      await StreamQuery.stream(queryFn, { batchSize: 2 }, onBatch);

      // Assert
      expect(queryFn).toHaveBeenCalledWith(undefined, 2);
      expect(onBatch).toHaveBeenCalledWith([], undefined);
    });
  });

  describe('streamAll', () => {
    it('Given: multiple batches When: streaming all Then: should return concatenated items', async () => {
      // Arrange
      const batches = [
        { items: [{ id: 'a' }], hasMore: true },
        { items: [{ id: 'b' }, { id: 'c' }], hasMore: false },
      ];
      const queryFn = jest.fn().mockImplementation(() => Promise.resolve(batches.shift()));

      // Act
      const result = await StreamQuery.streamAll(queryFn, { batchSize: 2 });

      // Assert
      expect(result).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createPrismaQuery', () => {
    it('Given: cursor and extra item When: querying Then: should return trimmed items and hasMore true', async () => {
      // Arrange
      const prismaQuery = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      const queryFn = StreamQuery.createPrismaQuery(prismaQuery);

      // Act
      const result = await queryFn('a', 2);

      // Assert
      expect(prismaQuery).toHaveBeenCalledWith({ cursor: { id: 'a' }, take: 3 });
      expect(result.items).toEqual([{ id: 'a' }, { id: 'b' }]);
      expect(result.hasMore).toBe(true);
    });

    it('Given: no cursor and exact items When: querying Then: should return items and hasMore false', async () => {
      // Arrange
      const prismaQuery = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const queryFn = StreamQuery.createPrismaQuery(prismaQuery);

      // Act
      const result = await queryFn(undefined, 2);

      // Assert
      expect(prismaQuery).toHaveBeenCalledWith({ take: 3 });
      expect(result.items).toEqual([{ id: 'a' }, { id: 'b' }]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('toPaginatedResult', () => {
    it('Given: batch size reached When: building result Then: should set hasMore and nextCursor', () => {
      // Arrange
      const items = [{ id: 'a' }, { id: 'b' }];

      // Act
      const result = StreamQuery.toPaginatedResult(items, 2);

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('b');
      expect(result.data).toEqual(items);
    });

    it('Given: partial batch When: building result Then: should not set nextCursor', () => {
      // Arrange
      const items = [{ id: 'a' }];

      // Act
      const result = StreamQuery.toPaginatedResult(items, 2);

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
      expect(result.total).toBe(1);
    });
  });
});
