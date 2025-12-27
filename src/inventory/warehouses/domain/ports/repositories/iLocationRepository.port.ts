import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';
import { Location } from '@warehouse/domain/entities/location.entity';

/**
 * Location repository port interface
 * Output port for location persistence following Hexagonal Architecture
 */
export interface ILocationRepository extends IReadRepository<Location>, IWriteRepository<Location> {
  findByCode(code: string, warehouseId: string, orgId: string): Promise<Location | null>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Location[]>;
  findDefaultLocation(warehouseId: string, orgId: string): Promise<Location | null>;
  existsByCode(code: string, warehouseId: string, orgId: string): Promise<boolean>;
}
