import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

/**
 * Sale repository port interface
 * Output port for sale persistence following Hexagonal Architecture
 */
export interface ISaleRepository extends IReadRepository<Sale>, IWriteRepository<Sale> {
  findBySaleNumber(saleNumber: string, orgId: string): Promise<Sale | null>;
  findByStatus(status: string, orgId: string): Promise<Sale[]>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Sale[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Sale[]>;
  getLastSaleNumberForYear(year: number, orgId: string): Promise<string | null>;
  findByMovementId(movementId: string, orgId: string): Promise<Sale | null>;
  // Lazy loading methods (optional for performance optimization)
  findByIdWithoutLines?(id: string, orgId: string): Promise<Sale | null>;
  loadLines?(saleId: string, orgId: string): Promise<SaleLine[]>;
  findAllWithoutLines?(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Sale>>;
}
