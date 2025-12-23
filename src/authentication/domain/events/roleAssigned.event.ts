import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class RoleAssignedEvent extends DomainEvent {
  constructor(
    private readonly _userId: string,
    private readonly _roleId: string,
    private readonly _roleName: string,
    private readonly _assignedBy: string,
    private readonly _orgId: string
  ) {
    super();
  }

  get eventName(): string {
    return 'RoleAssigned';
  }

  get occurredOn(): Date {
    return new Date();
  }

  get userId(): string {
    return this._userId;
  }

  get roleId(): string {
    return this._roleId;
  }

  get roleName(): string {
    return this._roleName;
  }

  get assignedBy(): string {
    return this._assignedBy;
  }

  get orgId(): string {
    return this._orgId;
  }
}
