import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IWarehouseCodeProps {
  value: string;
}

export class WarehouseCode extends ValueObject<IWarehouseCodeProps> {
  private constructor(props: IWarehouseCodeProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): WarehouseCode {
    return new WarehouseCode({ value: value.trim() });
  }

  private validate(props: IWarehouseCodeProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Warehouse code cannot be empty');
    }

    const trimmed = props.value.trim();

    if (trimmed.length < 3) {
      throw new Error('Warehouse code must be at least 3 characters long');
    }

    if (trimmed.length > 50) {
      throw new Error('Warehouse code must be at most 50 characters long');
    }

    // Alphanumeric, underscore, and hyphen only
    const codeRegex = /^[a-zA-Z0-9_-]+$/;
    if (!codeRegex.test(trimmed)) {
      throw new Error('Warehouse code can only contain letters, numbers, underscores, and hyphens');
    }

    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-')) {
      throw new Error('Warehouse code cannot start with underscore or hyphen');
    }

    if (trimmed.endsWith('_') || trimmed.endsWith('-')) {
      throw new Error('Warehouse code cannot end with underscore or hyphen');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: WarehouseCode): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toLowerCase() === other.props.value.toLowerCase();
  }
}
