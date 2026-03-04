import { ValueObject } from '@shared/domain/base/valueObject.base';

export type SaleStatusValue =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PICKING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED';

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
    return [
      'DRAFT',
      'CONFIRMED',
      'PICKING',
      'SHIPPED',
      'COMPLETED',
      'CANCELLED',
      'RETURNED',
    ].includes(value);
  }

  public isDraft(): boolean {
    return this.props.value === 'DRAFT';
  }

  public isConfirmed(): boolean {
    return this.props.value === 'CONFIRMED';
  }

  public isPicking(): boolean {
    return this.props.value === 'PICKING';
  }

  public isShipped(): boolean {
    return this.props.value === 'SHIPPED';
  }

  public isCompleted(): boolean {
    return this.props.value === 'COMPLETED';
  }

  public isCancelled(): boolean {
    return this.props.value === 'CANCELLED';
  }

  public canConfirm(): boolean {
    return this.props.value === 'DRAFT';
  }

  public canStartPicking(): boolean {
    return this.props.value === 'CONFIRMED';
  }

  public canShip(): boolean {
    return this.props.value === 'PICKING';
  }

  public canComplete(): boolean {
    return this.props.value === 'SHIPPED';
  }

  public isReturned(): boolean {
    return this.props.value === 'RETURNED';
  }

  public canReturn(): boolean {
    return this.props.value === 'COMPLETED' || this.props.value === 'SHIPPED';
  }

  public canSwapLine(): boolean {
    return this.props.value === 'CONFIRMED' || this.props.value === 'PICKING';
  }

  public canCancel(): boolean {
    return (
      this.props.value === 'DRAFT' ||
      this.props.value === 'CONFIRMED' ||
      this.props.value === 'PICKING'
    );
  }

  public getValue(): SaleStatusValue {
    return this.props.value;
  }
}
