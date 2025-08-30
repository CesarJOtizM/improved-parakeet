import { IReadRepository, IWriteRepository } from '@shared/domain/repository';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

export interface ITransferRepository extends IReadRepository<Transfer>, IWriteRepository<Transfer> {
  findByFromWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByToWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByStatus(status: string, orgId: string): Promise<Transfer[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Transfer[]>;
  findInTransitTransfers(orgId: string): Promise<Transfer[]>;
  findPendingTransfers(orgId: string): Promise<Transfer[]>;
}
