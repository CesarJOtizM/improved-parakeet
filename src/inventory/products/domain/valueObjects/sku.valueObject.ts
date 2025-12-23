import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface ISkuProps {
  value: string;
}

export class SKU extends ValueObject<ISkuProps> {
  private constructor(props: ISkuProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): SKU {
    return new SKU({ value: value.trim() });
  }

  private validate(props: ISkuProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('SKU cannot be empty');
    }

    const trimmed = props.value.trim();

    if (trimmed.length < 3) {
      throw new Error('SKU must be at least 3 characters long');
    }

    if (trimmed.length > 50) {
      throw new Error('SKU must be at most 50 characters long');
    }

    // Alphanumeric, underscore, and hyphen only
    const skuRegex = /^[a-zA-Z0-9_-]+$/;
    if (!skuRegex.test(trimmed)) {
      throw new Error('SKU can only contain letters, numbers, underscores, and hyphens');
    }

    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-')) {
      throw new Error('SKU cannot start with underscore or hyphen');
    }

    if (trimmed.endsWith('_') || trimmed.endsWith('-')) {
      throw new Error('SKU cannot end with underscore or hyphen');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: SKU): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toLowerCase() === other.props.value.toLowerCase();
  }
}
