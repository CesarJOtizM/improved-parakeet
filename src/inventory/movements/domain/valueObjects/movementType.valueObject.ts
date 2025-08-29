import { ValueObject } from '@shared/domain/base/valueObject.base';

export type MovementTypeValue =
  | 'IN'
  | 'OUT'
  | 'ADJUST_IN'
  | 'ADJUST_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN';

export class MovementType extends ValueObject<{ value: MovementTypeValue }> {
  constructor(value: MovementTypeValue) {
    super({ value });
  }

  public static create(value: MovementTypeValue): MovementType {
    if (!this.isValid(value)) {
      throw new Error(`Invalid movement type: ${value}`);
    }
    return new MovementType(value);
  }

  private static isValid(value: string): value is MovementTypeValue {
    return ['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(value);
  }

  public isInput(): boolean {
    return ['IN', 'ADJUST_IN', 'TRANSFER_IN'].includes(this.props.value);
  }

  public isOutput(): boolean {
    return ['OUT', 'ADJUST_OUT', 'TRANSFER_OUT'].includes(this.props.value);
  }

  public isTransfer(): boolean {
    return ['TRANSFER_IN', 'TRANSFER_OUT'].includes(this.props.value);
  }

  public isAdjustment(): boolean {
    return ['ADJUST_IN', 'ADJUST_OUT'].includes(this.props.value);
  }

  public getValue(): MovementTypeValue {
    return this.props.value;
  }
}
