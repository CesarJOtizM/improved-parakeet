import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';

import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { TransactionClient } from '@infrastructure/database/unitOfWork.service';

describe('UnitOfWork', () => {
  let unitOfWork: UnitOfWork;
  let mockPrisma: jest.Mocked<Pick<PrismaService, '$transaction'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<Pick<PrismaService, '$transaction'>>;

    unitOfWork = new UnitOfWork(mockPrisma as unknown as PrismaService);
  });

  describe('execute', () => {
    it('Given: a valid callback When: executing a transaction Then: should return the callback result', async () => {
      // Arrange
      const expectedResult = { id: 'product-1', name: 'Widget' };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<typeof expectedResult>>();
      callback.mockResolvedValue(expectedResult);

      // Act
      const result = await unitOfWork.execute(callback);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('Given: a valid callback When: transaction succeeds Then: should call $transaction with correct options', async () => {
      // Arrange
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<string>>();
      callback.mockResolvedValue('ok');

      // Act
      await unitOfWork.execute(callback);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel: 'ReadCommitted',
      });
    });

    it('Given: a callback that returns void When: executing Then: should complete without error', async () => {
      // Arrange
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<void>>();
      callback.mockResolvedValue(undefined);

      // Act
      const result = await unitOfWork.execute(callback);

      // Assert
      expect(result).toBeUndefined();
    });

    it('Given: a callback that throws When: executing Then: should propagate the error', async () => {
      // Arrange
      const dbError = new Error('Unique constraint violation');
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<never>>();
      callback.mockRejectedValue(dbError);

      // Act & Assert
      await expect(unitOfWork.execute(callback)).rejects.toThrow('Unique constraint violation');
    });

    it('Given: $transaction itself rejects When: executing Then: should propagate the transaction error', async () => {
      // Arrange
      const txError = new Error('Transaction timeout exceeded');
      mockPrisma.$transaction.mockRejectedValue(txError);

      const callback = jest.fn<(tx: TransactionClient) => Promise<string>>();

      // Act & Assert
      await expect(unitOfWork.execute(callback)).rejects.toThrow('Transaction timeout exceeded');
    });

    it('Given: a callback that performs multiple operations When: executing Then: should pass the transaction client to the callback', async () => {
      // Arrange
      const fakeTxClient = { product: {}, warehouse: {} } as unknown as TransactionClient;
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        return (fn as (tx: TransactionClient) => Promise<unknown>)(fakeTxClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<string>>();
      callback.mockResolvedValue('done');

      // Act
      await unitOfWork.execute(callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(fakeTxClient);
    });

    it('Given: a callback returning a complex type When: executing Then: should preserve the return type', async () => {
      // Arrange
      const complexResult = {
        created: [{ id: '1' }, { id: '2' }],
        updated: 3,
        deleted: 0,
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<typeof complexResult>>();
      callback.mockResolvedValue(complexResult);

      // Act
      const result = await unitOfWork.execute(callback);

      // Assert
      expect(result).toEqual(complexResult);
      expect(result.created).toHaveLength(2);
      expect(result.updated).toBe(3);
    });

    it('Given: a non-Error exception in callback When: executing Then: should still propagate the error', async () => {
      // Arrange
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback = jest.fn<(tx: TransactionClient) => Promise<never>>();
      callback.mockRejectedValue('string error');

      // Act & Assert
      await expect(unitOfWork.execute(callback)).rejects.toBe('string error');
    });

    it('Given: the transaction commits successfully When: a second transaction is started Then: should execute independently', async () => {
      // Arrange
      let callCount = 0;
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        callCount++;
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const callback1 = jest.fn<(tx: TransactionClient) => Promise<string>>();
      callback1.mockResolvedValue('result-1');

      const callback2 = jest.fn<(tx: TransactionClient) => Promise<string>>();
      callback2.mockResolvedValue('result-2');

      // Act
      const result1 = await unitOfWork.execute(callback1);
      const result2 = await unitOfWork.execute(callback2);

      // Assert
      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(callCount).toBe(2);
    });

    it('Given: a failed transaction When: a subsequent transaction is attempted Then: should execute normally', async () => {
      // Arrange
      let callIndex = 0;
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: unknown) => {
        callIndex++;
        const txClient = {} as TransactionClient;
        return (fn as (tx: TransactionClient) => Promise<unknown>)(txClient);
      });

      const failingCallback = jest.fn<(tx: TransactionClient) => Promise<never>>();
      failingCallback.mockRejectedValue(new Error('First fails'));

      const successCallback = jest.fn<(tx: TransactionClient) => Promise<string>>();
      successCallback.mockResolvedValue('recovered');

      // Act
      await expect(unitOfWork.execute(failingCallback)).rejects.toThrow('First fails');
      const result = await unitOfWork.execute(successCallback);

      // Assert
      expect(result).toBe('recovered');
      expect(callIndex).toBe(2);
    });
  });
});
