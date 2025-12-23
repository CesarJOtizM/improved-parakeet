import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IUsernameProps {
  value: string;
}

export class Username extends ValueObject<IUsernameProps> {
  private constructor(props: IUsernameProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): Username {
    return new Username({ value: value.trim() });
  }

  private validate(props: IUsernameProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }

    const trimmed = props.value.trim();

    if (trimmed.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (trimmed.length > 50) {
      throw new Error('Username must be at most 50 characters long');
    }

    // Alphanumeric, underscore, and hyphen only
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmed)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-')) {
      throw new Error('Username cannot start with underscore or hyphen');
    }

    if (trimmed.endsWith('_') || trimmed.endsWith('-')) {
      throw new Error('Username cannot end with underscore or hyphen');
    }

    // Cannot be only numbers
    if (/^\d+$/.test(trimmed)) {
      throw new Error('Username cannot be only numbers');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: Username): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toLowerCase() === other.props.value.toLowerCase();
  }
}
