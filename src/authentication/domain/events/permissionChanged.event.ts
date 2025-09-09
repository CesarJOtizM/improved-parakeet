import { Permission } from '@auth/domain/entities/permission.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class PermissionChangedEvent extends DomainEvent {
  constructor(
    private readonly permission: Permission,
    private readonly _changeType: 'CREATED' | 'UPDATED' | 'DELETED',
    private readonly _changedBy: string
  ) {
    super();
  }

  get eventName(): string {
    return 'PermissionChanged';
  }

  get occurredOn(): Date {
    return this.permission.updatedAt;
  }

  get permissionId(): string {
    return this.permission.id;
  }

  get orgId(): string {
    return this.permission.orgId;
  }

  get permissionName(): string {
    return this.permission.name;
  }

  get module(): string {
    return this.permission.module;
  }

  get action(): string {
    return this.permission.action;
  }

  get changeType(): 'CREATED' | 'UPDATED' | 'DELETED' {
    return this._changeType;
  }

  get changedBy(): string {
    return this._changedBy;
  }
}
