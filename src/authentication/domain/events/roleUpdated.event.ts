import { Role } from '@auth/domain/entities/role.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class RoleUpdatedEvent extends DomainEvent {
  constructor(private readonly role: Role) {
    super();
  }

  get eventName(): string {
    return 'RoleUpdated';
  }

  get occurredOn(): Date {
    return this.role.updatedAt;
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

  get isActive(): boolean {
    return this.role.isActive;
  }
}
