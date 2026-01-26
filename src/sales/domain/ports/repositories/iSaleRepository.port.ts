import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { IPrismaSpecification } from '@shared/domain/specifications';
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
  findBySpecification(
    spec: IPrismaSpecification<Sale>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Sale>>;
  // Lazy loading methods (optional for performance optimization)
  findByIdWithoutLines?(id: string, orgId: string): Promise<Sale | null>;
  loadLines?(saleId: string, orgId: string): Promise<SaleLine[]>;
  findAllWithoutLines?(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Sale>>;
  /**
   * Generates the next sale number atomically using database sequence
   * This prevents race conditions when creating sales concurrently
   */
  getNextSaleNumber(orgId: string, year: number): Promise<string>;

  /**
   * Adds a line directly to the sale without loading all existing lines.
   * This prevents race conditions when multiple lines are added concurrently.
   * The operation is atomic and validates the sale status before adding.
   *
   * @param saleId - The ID of the sale to add the line to
   * @param line - The line to add
   * @param orgId - The organization ID
   * @returns The created line with its ID
   * @throws Error if sale doesn't exist, is not in DRAFT status, or operation fails
   */
  addLine(saleId: string, line: SaleLine, orgId: string): Promise<SaleLine>;
}
