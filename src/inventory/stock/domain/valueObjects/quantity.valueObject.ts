import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface QuantityProps {
  value: number;
  precision: number;
}

export class Quantity extends ValueObject<QuantityProps> {
  constructor(props: QuantityProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: number, precision: number = 6): Quantity {
    return new Quantity({ value, precision });
  }

  private validate(props: QuantityProps): void {
    if (props.value < 0) {
      throw new Error('Quantity cannot be negative');
    }
    if (props.precision < 0 || props.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public add(quantity: Quantity): Quantity {
    return Quantity.create(this.props.value + quantity.props.value, this.props.precision);
  }

  public subtract(quantity: Quantity): Quantity {
    const result = this.props.value - quantity.props.value;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return Quantity.create(result, this.props.precision);
  }

  public multiply(factor: number): Quantity {
    return Quantity.create(this.props.value * factor, this.props.precision);
  }

  public divide(divisor: number): Quantity {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return Quantity.create(this.props.value / divisor, this.props.precision);
  }

  public isZero(): boolean {
    return this.props.value === 0;
  }

  public isPositive(): boolean {
    return this.props.value > 0;
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
}
