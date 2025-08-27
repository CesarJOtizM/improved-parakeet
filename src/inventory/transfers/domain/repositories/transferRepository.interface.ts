import { ReadRepository, WriteRepository } from '@shared/domain/repository';
import { Transfer } from '../entities/transfer.entity';

export interface TransferRepository extends ReadRepository<Transfer>, WriteRepository<Transfer> {
  findByFromWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByToWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByStatus(status: string, orgId: string): Promise<Transfer[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Transfer[]>;
  findInTransitTransfers(orgId: string): Promise<Transfer[]>;
  findPendingTransfers(orgId: string): Promise<Transfer[]>;
}
