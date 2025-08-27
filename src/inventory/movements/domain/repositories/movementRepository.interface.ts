import { ReadRepository, WriteRepository } from '@shared/domain/repository';

import { Movement } from '../entities/movement.entity';

export interface MovementRepository extends ReadRepository<Movement>, WriteRepository<Movement> {
  findByWarehouse(warehouseId: string, orgId: string): Promise<Movement[]>;
  findByStatus(status: string, orgId: string): Promise<Movement[]>;
  findByType(type: string, orgId: string): Promise<Movement[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Movement[]>;
  findByProduct(productId: string, orgId: string): Promise<Movement[]>;
  findDraftMovements(orgId: string): Promise<Movement[]>;
  findPostedMovements(orgId: string): Promise<Movement[]>;
}
