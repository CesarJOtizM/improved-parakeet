import { Session } from '@auth/domain/entities/session.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class SessionExpiredEvent extends DomainEvent {
  constructor(private readonly session: Session) {
    super();
  }

  get eventName(): string {
    return 'SessionExpired';
  }

  get occurredOn(): Date {
    return new Date();
  }

  get sessionId(): string {
    return this.session.id;
  }

  get userId(): string {
    return this.session.userId;
  }

  get orgId(): string {
    return this.session.orgId;
  }

  get token(): string {
    return this.session.token;
  }

  get expiresAt(): Date {
    return this.session.expiresAt;
  }

  get ipAddress(): string | undefined {
    return this.session.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.session.userAgent;
  }
}
