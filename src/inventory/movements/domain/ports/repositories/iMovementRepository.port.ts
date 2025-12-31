import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { IPrismaSpecification } from '@shared/domain/specifications';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

/**
 * Movement repository port interface
 * Output port for movement persistence following Hexagonal Architecture
 */
export interface IMovementRepository extends IReadRepository<Movement>, IWriteRepository<Movement> {
  findByWarehouse(warehouseId: string, orgId: string): Promise<Movement[]>;
  findByStatus(status: string, orgId: string): Promise<Movement[]>;
  findByType(type: string, orgId: string): Promise<Movement[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Movement[]>;
  findByProduct(productId: string, orgId: string): Promise<Movement[]>;
  findDraftMovements(orgId: string): Promise<Movement[]>;
  findPostedMovements(orgId: string): Promise<Movement[]>;
  findBySpecification(
    spec: IPrismaSpecification<Movement>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Movement>>;
  // Lazy loading methods (optional for performance optimization)
  findByIdWithoutLines?(id: string, orgId: string): Promise<Movement | null>;
  loadLines?(movementId: string, orgId: string): Promise<MovementLine[]>;
  findAllWithoutLines?(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Movement>>;
}
