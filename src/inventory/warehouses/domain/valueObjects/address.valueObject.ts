import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IAddressProps {
  value: string;
}

export class Address extends ValueObject<IAddressProps> {
  private constructor(props: IAddressProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): Address {
    return new Address({ value: value.trim() });
  }

  private validate(props: IAddressProps): void {
    const trimmed = props.value.trim();

    if (trimmed.length > 0 && trimmed.length > 500) {
      throw new Error('Address must be at most 500 characters long');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: Address): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
