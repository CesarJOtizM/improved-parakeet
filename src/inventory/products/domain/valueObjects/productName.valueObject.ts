import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IProductNameProps {
  value: string;
}

export class ProductName extends ValueObject<IProductNameProps> {
  private constructor(props: IProductNameProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): ProductName {
    return new ProductName({ value: value.trim() });
  }

  private validate(props: IProductNameProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Product name cannot be empty');
    }

    const trimmed = props.value.trim();

    if (trimmed.length < 2) {
      throw new Error('Product name must be at least 2 characters long');
    }

    if (trimmed.length > 200) {
      throw new Error('Product name must be at most 200 characters long');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ProductName): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
