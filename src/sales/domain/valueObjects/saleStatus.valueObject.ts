import { ValueObject } from '@shared/domain/base/valueObject.base';

export type SaleStatusValue = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export class SaleStatus extends ValueObject<{ value: SaleStatusValue }> {
  constructor(value: SaleStatusValue) {
    super({ value });
  }

  public static create(value: SaleStatusValue): SaleStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid sale status: ${value}`);
    }
    return new SaleStatus(value);
  }

  private static isValid(value: string): value is SaleStatusValue {
    return ['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(value);
  }

  public isDraft(): boolean {
    return this.props.value === 'DRAFT';
  }

  public isConfirmed(): boolean {
    return this.props.value === 'CONFIRMED';
  }

  public isCancelled(): boolean {
    return this.props.value === 'CANCELLED';
  }

  public canConfirm(): boolean {
    return this.props.value === 'DRAFT';
  }

  public canCancel(): boolean {
    return this.props.value === 'DRAFT' || this.props.value === 'CONFIRMED';
  }

  public getValue(): SaleStatusValue {
    return this.props.value;
  }
}
