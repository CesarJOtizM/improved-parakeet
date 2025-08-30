import { User } from '@auth/domain/entities/user.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    private readonly user: User,
    private readonly orgSlug?: string,
    private readonly orgId?: string
  ) {
    super();
  }

  get eventName(): string {
    return 'UserRegistered';
  }

  get occurredOn(): Date {
    return this.user.createdAt;
  }

  get userId(): string {
    return this.user.id;
  }

  get userOrgId(): string {
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

  get organizationSlug(): string | undefined {
    return this.orgSlug;
  }

  get organizationId(): string | undefined {
    return this.orgId;
  }

  get userStatus(): string {
    return this.user.status.getValue();
  }
}
