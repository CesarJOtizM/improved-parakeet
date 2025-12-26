import { Return } from '@returns/domain/entities/return.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IReturnRepository extends IReadRepository<Return>, IWriteRepository<Return> {
  findByReturnNumber(returnNumber: string, orgId: string): Promise<Return | null>;
  findByStatus(status: string, orgId: string): Promise<Return[]>;
  findByType(type: string, orgId: string): Promise<Return[]>;
  findBySaleId(saleId: string, orgId: string): Promise<Return[]>;
  findBySourceMovementId(movementId: string, orgId: string): Promise<Return[]>;
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Return[]>;
  getLastReturnNumberForYear(year: number, orgId: string): Promise<string | null>;
  findByReturnMovementId(movementId: string, orgId: string): Promise<Return | null>;
}
