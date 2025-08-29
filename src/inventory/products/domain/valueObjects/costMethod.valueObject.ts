import { ValueObject } from '@shared/domain/base/valueObject.base';

export type CostMethodValue = 'AVG' | 'FIFO';

export class CostMethod extends ValueObject<{ value: CostMethodValue }> {
  constructor(value: CostMethodValue) {
    super({ value });
  }

  public static create(value: CostMethodValue): CostMethod {
    if (!this.isValid(value)) {
      throw new Error(`Invalid cost method: ${value}`);
    }
    return new CostMethod(value);
  }

  private static isValid(value: string): value is CostMethodValue {
    return ['AVG', 'FIFO'].includes(value);
  }

  public isAverage(): boolean {
    return this.props.value === 'AVG';
  }

  public isFifo(): boolean {
    return this.props.value === 'FIFO';
  }

  public getValue(): CostMethodValue {
    return this.props.value;
  }
}
