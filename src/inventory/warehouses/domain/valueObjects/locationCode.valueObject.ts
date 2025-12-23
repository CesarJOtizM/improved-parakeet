import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface ILocationCodeProps {
  value: string;
}

export class LocationCode extends ValueObject<ILocationCodeProps> {
  private constructor(props: ILocationCodeProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): LocationCode {
    return new LocationCode({ value: value.trim() });
  }

  private validate(props: ILocationCodeProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Location code cannot be empty');
    }

    const trimmed = props.value.trim();

    if (trimmed.length < 2) {
      throw new Error('Location code must be at least 2 characters long');
    }

    if (trimmed.length > 50) {
      throw new Error('Location code must be at most 50 characters long');
    }

    // Alphanumeric, underscore, and hyphen only
    const codeRegex = /^[a-zA-Z0-9_-]+$/;
    if (!codeRegex.test(trimmed)) {
      throw new Error('Location code can only contain letters, numbers, underscores, and hyphens');
    }

    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-')) {
      throw new Error('Location code cannot start with underscore or hyphen');
    }

    if (trimmed.endsWith('_') || trimmed.endsWith('-')) {
      throw new Error('Location code cannot end with underscore or hyphen');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: LocationCode): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toLowerCase() === other.props.value.toLowerCase();
  }
}
