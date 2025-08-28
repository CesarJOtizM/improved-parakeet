import { Role } from '@auth/domain/entities/role.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class RoleCreatedEvent extends DomainEvent {
  constructor(private readonly role: Role) {
    super();
  }

  get eventName(): string {
    return 'RoleCreated';
  }

  get occurredOn(): Date {
    return this.role.createdAt;
  }

  get roleId(): string {
    return this.role.id;
  }

  get orgId(): string {
    return this.role.orgId;
  }

  get roleName(): string {
    return this.role.name;
  }

  get description(): string | undefined {
    return this.role.description;
  }
}
