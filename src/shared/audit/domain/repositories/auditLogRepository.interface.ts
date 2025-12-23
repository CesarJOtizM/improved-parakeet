import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IReadRepository } from '@shared/domain/repository';

export interface IAuditLogRepository extends IReadRepository<AuditLog> {
  save(auditLog: AuditLog): Promise<AuditLog>;
  saveBatch(auditLogs: AuditLog[]): Promise<AuditLog[]>;
  findByEntity(
    entityType: EntityType,
    entityId: string,
    orgId: string,
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]>;
  findByUser(userId: string, orgId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
  findByAction(
    action: AuditAction,
    orgId: string,
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]>;
  findByDateRange(
    orgId: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]>;
  findByFilters(
    orgId: string,
    filters: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number,
    offset?: number
  ): Promise<AuditLog[]>;
  countByFilters(
    orgId: string,
    filters: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<number>;
}
