import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { PrismaSpecification, PrismaWhereInput } from '@shared/domain/specifications';

/**
 * Specification for audit logs by entity type
 */
export class AuditLogByEntityTypeSpecification extends PrismaSpecification<AuditLog> {
  constructor(private readonly entityType: string) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    return auditLog.entityType.getValue() === this.entityType;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null, // Audit logs can have null orgId for system-level logs
      entityType: this.entityType,
    };
  }
}

/**
 * Specification for audit logs by action
 */
export class AuditLogByActionSpecification extends PrismaSpecification<AuditLog> {
  constructor(private readonly action: string) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    return auditLog.action.getValue() === this.action;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null,
      action: this.action,
    };
  }
}

/**
 * Specification for audit logs created within a date range
 */
export class AuditLogByDateRangeSpecification extends PrismaSpecification<AuditLog> {
  constructor(
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    const createdAt = auditLog.createdAt;
    return createdAt >= this.startDate && createdAt <= this.endDate;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null,
      createdAt: {
        gte: this.startDate,
        lte: this.endDate,
      },
    };
  }
}

/**
 * Specification for audit logs by user (performedBy)
 */
export class AuditLogByUserSpecification extends PrismaSpecification<AuditLog> {
  constructor(private readonly userId: string) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    return auditLog.performedBy === this.userId;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null,
      performedBy: this.userId,
    };
  }
}

/**
 * Specification for audit logs by HTTP method
 */
export class AuditLogByHttpMethodSpecification extends PrismaSpecification<AuditLog> {
  constructor(private readonly httpMethod: string) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    return auditLog.httpMethod === this.httpMethod;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null,
      httpMethod: this.httpMethod,
    };
  }
}

/**
 * Specification for audit logs by entity ID
 */
export class AuditLogByEntityIdSpecification extends PrismaSpecification<AuditLog> {
  constructor(private readonly entityId: string) {
    super();
  }

  public isSatisfiedBy(auditLog: AuditLog): boolean {
    return auditLog.entityId === this.entityId;
  }

  public toPrismaWhere(orgId: string): PrismaWhereInput {
    return {
      orgId: orgId || null,
      entityId: this.entityId,
    };
  }
}
