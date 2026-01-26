import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

/**
 * Return repository port interface
 * Output port for return persistence following Hexagonal Architecture
 */
export interface IReturnRepository extends IReadRepository<Return>, IWriteRepository<Return> {
  findByReturnNumber(returnNumber: string, orgId: string): Promise<Return | null>;
  findByStatus(status: string, orgId: string): Promise<Return[]>;
  findByType(type: string, orgId: string): Promise<Return[]>;
  findBySaleId(saleId: string, orgId: string): Promise<Return[]>;
  findBySourceMovementId(movementId: string, orgId: string): Promise<Return[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Return[]>;
  getLastReturnNumberForYear(year: number, orgId: string): Promise<string | null>;
  findByReturnMovementId(movementId: string, orgId: string): Promise<Return | null>;
  /**
   * Generates the next return number atomically using database sequence
   * This prevents race conditions when creating returns concurrently
   */
  getNextReturnNumber(orgId: string, year: number): Promise<string>;

  /**
   * Adds a line directly to the return without loading all existing lines.
   * This prevents race conditions when multiple lines are added concurrently.
   * The operation is atomic and validates the return status before adding.
   *
   * @param returnId - The ID of the return to add the line to
   * @param line - The line to add
   * @param orgId - The organization ID
   * @returns The created line with its ID
   * @throws Error if return doesn't exist, is not in DRAFT status, or operation fails
   */
  addLine(returnId: string, line: ReturnLine, orgId: string): Promise<ReturnLine>;
}
