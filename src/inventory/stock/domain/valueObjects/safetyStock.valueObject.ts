import { ValueObject } from '@shared/domain/base/valueObject.base';

import { MinQuantity } from './minQuantity.valueObject';

export interface ISafetyStockProps {
  value: number;
  precision: number;
}

export class SafetyStock extends ValueObject<ISafetyStockProps> {
  constructor(props: ISafetyStockProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: number, precision: number = 6): SafetyStock {
    return new SafetyStock({ value, precision });
  }

  public static createWithMin(
    value: number,
    minQuantity: MinQuantity,
    precision: number = 6
  ): SafetyStock {
    const safetyStock = new SafetyStock({ value, precision });
    safetyStock.validateWithMin(minQuantity);
    return safetyStock;
  }

  private validate(props: ISafetyStockProps): void {
    if (props.value < 0) {
      throw new Error('SafetyStock cannot be negative');
    }
    if (props.precision < 0 || props.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  private validateWithMin(minQuantity: MinQuantity): void {
    if (this.props.value > minQuantity.getNumericValue()) {
      throw new Error('SafetyStock should typically be less than or equal to MinQuantity');
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

  public equals(other: SafetyStock): boolean {
    return this.props.value === other.props.value && this.props.precision === other.props.precision;
  }
}
