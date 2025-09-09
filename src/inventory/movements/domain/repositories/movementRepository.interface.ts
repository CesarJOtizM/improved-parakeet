import { Movement } from '@movement/domain/entities/movement.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IMovementRepository extends IReadRepository<Movement>, IWriteRepository<Movement> {
  findByWarehouse(warehouseId: string, orgId: string): Promise<Movement[]>;
  findByStatus(status: string, orgId: string): Promise<Movement[]>;
  findByType(type: string, orgId: string): Promise<Movement[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Movement[]>;
  findByProduct(productId: string, orgId: string): Promise<Movement[]>;
  findDraftMovements(orgId: string): Promise<Movement[]>;
  findPostedMovements(orgId: string): Promise<Movement[]>;
}
