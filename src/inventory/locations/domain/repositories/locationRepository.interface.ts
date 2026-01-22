import { Location } from '../entities/location.entity';

export interface ILocationFilters {
  warehouseId?: string;
  type?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface ILocationRepository {
  findById(id: string, orgId: string): Promise<Location | null>;
  findByCode(code: string, warehouseId: string, orgId: string): Promise<Location | null>;
  findAll(orgId: string, filters?: ILocationFilters): Promise<Location[]>;
  findByWarehouse(warehouseId: string, orgId: string): Promise<Location[]>;
  findChildren(parentId: string, orgId: string): Promise<Location[]>;
  save(location: Location): Promise<Location>;
  delete(id: string, orgId: string): Promise<void>;
}
