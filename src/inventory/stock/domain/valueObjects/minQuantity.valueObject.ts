import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IMinQuantityProps {
  value: number;
  precision: number;
}

export class MinQuantity extends ValueObject<IMinQuantityProps> {
  constructor(props: IMinQuantityProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: number, precision: number = 6): MinQuantity {
    return new MinQuantity({ value, precision });
  }

  private validate(props: IMinQuantityProps): void {
    if (props.value < 0) {
      throw new Error('MinQuantity cannot be negative');
    }
    if (props.precision < 0 || props.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public getNumericValue(): number {
    return this.props.value;
  }

  public getPrecision(): number {
    return this.props.precision;
  }

  public toFixed(): string {
    return this.props.value.toFixed(this.props.precision);
  }

  public isGreaterThan(value: number): boolean {
    return this.props.value > value;
  }

  public isLessThan(value: number): boolean {
    return this.props.value < value;
  }

  public equals(other: MinQuantity): boolean {
    return this.props.value === other.props.value && this.props.precision === other.props.precision;
  }
}
