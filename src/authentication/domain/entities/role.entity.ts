import { RoleCreatedEvent } from '@auth/domain/events/roleCreated.event';
import { RoleUpdatedEvent } from '@auth/domain/events/roleUpdated.event';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface IRoleProps {
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
}

export class Role extends AggregateRoot<IRoleProps> {
  private constructor(props: IRoleProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IRoleProps, orgId?: string): Role {
    // Validate: system roles must not have orgId
    if (props.isSystem && orgId) {
      throw new Error('System roles cannot have an organization ID');
    }
    // Validate: custom roles must have orgId
    if (!props.isSystem && !orgId) {
      throw new Error('Custom roles must have an organization ID');
    }

    const role = new Role(props, undefined, orgId);
    role.addDomainEvent(new RoleCreatedEvent(role));
    return role;
  }

  public static reconstitute(props: IRoleProps, id: string, orgId?: string): Role {
    return new Role(props, id, orgId);
  }

  public update(props: Partial<IRoleProps>): void {
    // Prevent updating isSystem after creation
    if (props.isSystem !== undefined && props.isSystem !== this.props.isSystem) {
      throw new Error('Cannot change isSystem property after role creation');
    }
    // Prevent updating name for system roles
    if (this.props.isSystem && props.name !== undefined && props.name !== this.props.name) {
      throw new Error('Cannot change name of system roles');
    }

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

  public isSystemRole(): boolean {
    return this.props.isSystem;
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

  get isSystem(): boolean {
    return this.props.isSystem;
  }
}
