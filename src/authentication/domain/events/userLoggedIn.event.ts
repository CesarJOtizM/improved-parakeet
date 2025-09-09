import { User } from '@auth/domain/entities/user.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    private readonly user: User,
    private readonly _loginTimestamp: Date,
    private readonly _ipAddress?: string,
    private readonly _userAgent?: string
  ) {
    super();
  }

  get eventName(): string {
    return 'UserLoggedIn';
  }

  get occurredOn(): Date {
    return this._loginTimestamp;
  }

  get userId(): string {
    return this.user.id;
  }

  get orgId(): string {
    return this.user.orgId;
  }

  get email(): string {
    return this.user.email;
  }

  get username(): string {
    return this.user.username;
  }

  get loginTimestamp(): Date {
    return this._loginTimestamp;
  }

  get ipAddress(): string | undefined {
    return this._ipAddress;
  }

  get userAgent(): string | undefined {
    return this._userAgent;
  }
}
