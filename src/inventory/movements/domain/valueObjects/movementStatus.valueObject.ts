import { ValueObject } from '@shared/domain/base/valueObject.base';

export type MovementStatusValue = 'DRAFT' | 'POSTED' | 'VOID';

export class MovementStatus extends ValueObject<{ value: MovementStatusValue }> {
  constructor(value: MovementStatusValue) {
    super({ value });
  }

  public static create(value: MovementStatusValue): MovementStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid movement status: ${value}`);
    }
    return new MovementStatus(value);
  }

  private static isValid(value: string): value is MovementStatusValue {
    return ['DRAFT', 'POSTED', 'VOID'].includes(value);
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

  public getValue(): MovementStatusValue {
    return this.props.value;
  }
}
