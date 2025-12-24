import { ValueObject } from '@shared/domain/base/valueObject.base';

import { MinQuantity } from './minQuantity.valueObject';

export interface IMaxQuantityProps {
  value: number;
  precision: number;
}

export class MaxQuantity extends ValueObject<IMaxQuantityProps> {
  constructor(props: IMaxQuantityProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: number, precision: number = 6): MaxQuantity {
    return new MaxQuantity({ value, precision });
  }

  public static createWithMin(
    value: number,
    minQuantity: MinQuantity,
    precision: number = 6
  ): MaxQuantity {
    const maxQuantity = new MaxQuantity({ value, precision });
    maxQuantity.validateWithMin(minQuantity);
    return maxQuantity;
  }

  private validate(props: IMaxQuantityProps): void {
    if (props.value < 0) {
      throw new Error('MaxQuantity cannot be negative');
    }
    if (props.precision < 0 || props.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  private validateWithMin(minQuantity: MinQuantity): void {
    if (this.props.value <= minQuantity.getNumericValue()) {
      throw new Error('MaxQuantity must be greater than MinQuantity');
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

  public isGreaterThanMin(minQuantity: MinQuantity): boolean {
    return this.props.value > minQuantity.getNumericValue();
  }

  public equals(other: MaxQuantity): boolean {
    return this.props.value === other.props.value && this.props.precision === other.props.precision;
  }
}
