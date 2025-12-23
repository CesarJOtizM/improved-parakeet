import { IReadRepository, IWriteRepository } from '@shared/domain/repository';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';

export interface IWarehouseRepository
  extends IReadRepository<Warehouse>,
    IWriteRepository<Warehouse> {
  findByCode(code: string, orgId: string): Promise<Warehouse | null>;
  existsByCode(code: string, orgId: string): Promise<boolean>;
  findActive(orgId: string): Promise<Warehouse[]>;
}
