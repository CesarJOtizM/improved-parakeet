import { ValueObject } from '@shared/domain/base/valueObject.base';

export type MovementStatusValue = 'DRAFT' | 'POSTED' | 'VOID';

export class MovementStatus extends ValueObject<MovementStatusValue> {
  constructor(value: MovementStatusValue) {
    super(value);
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
    return this.props === 'DRAFT';
  }

  public isPosted(): boolean {
    return this.props === 'POSTED';
  }

  public isVoid(): boolean {
    return this.props === 'VOID';
  }

  public canPost(): boolean {
    return this.props === 'DRAFT';
  }

  public canVoid(): boolean {
    return this.props === 'POSTED';
  }

  public getValue(): MovementStatusValue {
    return this.props;
  }
}
