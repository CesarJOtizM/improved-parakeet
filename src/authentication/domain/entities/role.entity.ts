import { RoleCreatedEvent } from '@auth/domain/events/roleCreated.event';
import { RoleUpdatedEvent } from '@auth/domain/events/roleUpdated.event';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface RoleProps {
  name: string;
  description?: string;
  isActive: boolean;
}

export class Role extends AggregateRoot<RoleProps> {
  private constructor(props: RoleProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: RoleProps, orgId: string): Role {
    const role = new Role(props, undefined, orgId);
    role.addDomainEvent(new RoleCreatedEvent(role));
    return role;
  }

  public static reconstitute(props: RoleProps, id: string, orgId: string): Role {
    return new Role(props, id, orgId);
  }

  public update(props: Partial<RoleProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.description !== undefined) this.props.description = props.description;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;

    this.updateTimestamp();
    this.addDomainEvent(new RoleUpdatedEvent(this));
  }

  public activate(): void {
    this.props.isActive = true;
    this.updateTimestamp();
    this.addDomainEvent(new RoleUpdatedEvent(this));
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.updateTimestamp();
    this.addDomainEvent(new RoleUpdatedEvent(this));
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
