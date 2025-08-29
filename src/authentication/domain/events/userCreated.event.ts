import { User } from '@auth/domain/entities/user.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class UserCreatedEvent extends DomainEvent {
  constructor(private readonly user: User) {
    super();
  }

  get eventName(): string {
    return 'UserCreated';
  }

  get occurredOn(): Date {
    return this.user.createdAt;
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

  get name(): string {
    return this.user.name;
  }

  get firstName(): string {
    return this.user.firstName;
  }

  get lastName(): string {
    return this.user.lastName;
  }
}
