import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from './generated/prisma';
import { PrismaService } from './prisma.service';

export type TransactionClient = Prisma.TransactionClient;

export interface IUnitOfWork {
  /**
   * Executes a function within a database transaction.
   * All operations within the callback will be atomic.
   * If any operation fails, all changes are rolled back.
   */
  execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

@Injectable()
export class UnitOfWork implements IUnitOfWork {
  private readonly logger = new Logger(UnitOfWork.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    this.logger.debug('Starting transaction');

    try {
      const result = await this.prisma.$transaction(
        async tx => {
          return await fn(tx);
        },
        {
          maxWait: 10000, // 10 seconds max wait time
          timeout: 30000, // 30 seconds timeout
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      this.logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      this.logger.error('Transaction failed, rolling back', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
