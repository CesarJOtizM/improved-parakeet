import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import type { UserStatusValue } from '@auth/domain/valueObjects/userStatus.valueObject';

export class UserStatusChangedEvent extends DomainEvent {
  constructor(
    private readonly _userId: string,
    private readonly _oldStatus: UserStatusValue,
    private readonly _newStatus: UserStatusValue,
    private readonly _changedBy: string,
    private readonly _orgId: string,
    private readonly _reason?: string
  ) {
    super();
  }

  get eventName(): string {
    return 'UserStatusChanged';
  }

  get occurredOn(): Date {
    return new Date();
  }

  get userId(): string {
    return this._userId;
  }

  get oldStatus(): UserStatusValue {
    return this._oldStatus;
  }

  get newStatus(): UserStatusValue {
    return this._newStatus;
  }

  get changedBy(): string {
    return this._changedBy;
  }

  get orgId(): string {
    return this._orgId;
  }

  get reason(): string | undefined {
    return this._reason;
  }
}
