import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { Entity } from '@shared/domain/base/entity.base';

export interface IAuditLogProps {
  entityType: EntityType;
  entityId?: string;
  action: AuditAction;
  performedBy?: string;
  metadata: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  httpMethod?: string;
  httpUrl?: string;
  httpStatusCode?: number;
  duration?: number;
}

export class AuditLog extends Entity<IAuditLogProps> {
  private constructor(props: IAuditLogProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IAuditLogProps, orgId?: string): AuditLog {
    return new AuditLog(props, undefined, orgId);
  }

  public static reconstitute(props: IAuditLogProps, id: string, orgId?: string): AuditLog {
    return new AuditLog(props, id, orgId);
  }

  // Getters
  get entityType(): EntityType {
    return this.props.entityType;
  }

  get entityId(): string | undefined {
    return this.props.entityId;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get performedBy(): string | undefined {
    return this.props.performedBy;
  }

  get metadata(): AuditMetadata {
    return this.props.metadata;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  get httpMethod(): string | undefined {
    return this.props.httpMethod;
  }

  get httpUrl(): string | undefined {
    return this.props.httpUrl;
  }

  get httpStatusCode(): number | undefined {
    return this.props.httpStatusCode;
  }

  get duration(): number | undefined {
    return this.props.duration;
  }
}
