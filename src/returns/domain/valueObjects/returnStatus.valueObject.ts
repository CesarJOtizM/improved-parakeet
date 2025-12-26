import { ValueObject } from '@shared/domain/base/valueObject.base';

export type ReturnStatusValue = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export class ReturnStatus extends ValueObject<{ value: ReturnStatusValue }> {
  constructor(value: ReturnStatusValue) {
    super({ value });
  }

  public static create(value: ReturnStatusValue): ReturnStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid return status: ${value}`);
    }
    return new ReturnStatus(value);
  }

  private static isValid(value: string): value is ReturnStatusValue {
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

  public getValue(): ReturnStatusValue {
    return this.props.value;
  }
}
