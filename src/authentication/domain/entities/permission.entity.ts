import { Entity } from '@shared/domain/base/entity.base';

export interface PermissionProps {
  name: string;
  description?: string;
  module: string;
  action: string;
}

export class Permission extends Entity<PermissionProps> {
  private constructor(props: PermissionProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: PermissionProps, orgId: string): Permission {
    return new Permission(props, undefined, orgId);
  }

  public static reconstitute(props: PermissionProps, id: string, orgId: string): Permission {
    return new Permission(props, id, orgId);
  }

  public update(props: Partial<PermissionProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.description !== undefined) this.props.description = props.description;
    if (props.module !== undefined) this.props.module = props.module;
    if (props.action !== undefined) this.props.action = props.action;

    this.updateTimestamp();
  }

  public getFullPermission(): string {
    return `${this.props.module}:${this.props.action}`;
  }

  public isModulePermission(module: string): boolean {
    return this.props.module === module;
  }

  public isActionPermission(action: string): boolean {
    return this.props.action === action;
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get module(): string {
    return this.props.module;
  }

  get action(): string {
    return this.props.action;
  }
}
