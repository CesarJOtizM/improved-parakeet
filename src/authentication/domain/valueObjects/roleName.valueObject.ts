import { SYSTEM_ROLES } from '@shared/constants/security.constants';
import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IRoleNameProps {
  value: string;
}

export class RoleName extends ValueObject<IRoleNameProps> {
  private constructor(props: IRoleNameProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): RoleName {
    return new RoleName({ value: value.toUpperCase().trim() });
  }

  private validate(props: IRoleNameProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Role name cannot be empty');
    }

    const trimmed = props.value.trim().toUpperCase();

    // Must be uppercase
    if (trimmed !== props.value) {
      throw new Error('Role name must be uppercase');
    }

    // Must be snake_case format (uppercase)
    const roleNameRegex = /^[A-Z][A-Z0-9_]*[A-Z0-9]$/;
    if (!roleNameRegex.test(trimmed)) {
      throw new Error('Role name must be in UPPER_SNAKE_CASE format');
    }

    // Cannot start or end with underscore
    if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
      throw new Error('Role name cannot start or end with underscore');
    }

    // Cannot have consecutive underscores
    if (trimmed.includes('__')) {
      throw new Error('Role name cannot have consecutive underscores');
    }

    // Validate against predefined system roles (optional check, but recommended)
    const systemRoles = Object.values(SYSTEM_ROLES);
    const isSystemRole = systemRoles.includes(
      trimmed as (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES]
    );

    // Allow custom roles but log warning if not a system role
    if (!isSystemRole && trimmed.length > 50) {
      throw new Error('Role name must be at most 50 characters long');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: RoleName): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  public isSystemRole(): boolean {
    const systemRoles = Object.values(SYSTEM_ROLES);
    return systemRoles.includes(
      this.props.value as (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES]
    );
  }
}
