import { ValueObject } from '@shared/domain/base/valueObject.base';

export type MovementStatusValue = 'DRAFT' | 'POSTED' | 'VOID' | 'RETURNED';

export class MovementStatus extends ValueObject<{ value: MovementStatusValue }> {
  constructor(value: MovementStatusValue) {
    super({ value });
  }

  public static create(value: MovementStatusValue | string): MovementStatus {
    const normalized = this.normalize(value);
    if (!normalized) {
      throw new Error(`Invalid movement status: ${value}`);
    }
    return new MovementStatus(normalized);
  }

  private static normalize(value: string): MovementStatusValue | null {
    // Handle legacy 'VOIDED' values in database
    if (value === 'VOIDED') return 'VOID';
    if (['DRAFT', 'POSTED', 'VOID', 'RETURNED'].includes(value))
      return value as MovementStatusValue;
    return null;
  }

  public isDraft(): boolean {
    return this.props.value === 'DRAFT';
  }

  public isPosted(): boolean {
    return this.props.value === 'POSTED';
  }

  public isVoid(): boolean {
    return this.props.value === 'VOID';
  }

  public canPost(): boolean {
    return this.props.value === 'DRAFT';
  }

  public canVoid(): boolean {
    return this.props.value === 'POSTED';
  }

  public isReturned(): boolean {
    return this.props.value === 'RETURNED';
  }

  public canReturn(): boolean {
    return this.props.value === 'POSTED';
  }

  public getValue(): MovementStatusValue {
    return this.props.value;
  }
}
