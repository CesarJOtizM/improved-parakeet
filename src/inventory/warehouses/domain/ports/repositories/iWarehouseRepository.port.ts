import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';

/**
 * Warehouse repository port interface
 * Output port for warehouse persistence following Hexagonal Architecture
 */
export interface IWarehouseRepository
  extends IReadRepository<Warehouse>, IWriteRepository<Warehouse> {
  findByCode(code: string, orgId: string): Promise<Warehouse | null>;
  existsByCode(code: string, orgId: string): Promise<boolean>;
  findActive(orgId: string): Promise<Warehouse[]>;
}
