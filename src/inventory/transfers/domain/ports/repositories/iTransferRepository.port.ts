import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

/**
 * Transfer repository port interface
 * Output port for transfer persistence following Hexagonal Architecture
 */
export interface ITransferRepository extends IReadRepository<Transfer>, IWriteRepository<Transfer> {
  findByFromWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByToWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]>;
  findByStatus(status: string, orgId: string): Promise<Transfer[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Transfer[]>;
  findInTransitTransfers(orgId: string): Promise<Transfer[]>;
  findPendingTransfers(orgId: string): Promise<Transfer[]>;
}
