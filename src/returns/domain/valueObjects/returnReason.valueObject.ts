import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IReturnReasonProps {
  value: string | null;
}

export class ReturnReason extends ValueObject<IReturnReasonProps> {
  private constructor(props: IReturnReasonProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string | null | undefined): ReturnReason {
    return new ReturnReason({ value: value || null });
  }

  private validate(props: IReturnReasonProps): void {
    if (props.value !== null && props.value !== undefined) {
      if (typeof props.value !== 'string') {
        throw new Error('Return reason must be a string or null');
      }
      if (props.value.trim().length === 0) {
        throw new Error('Return reason cannot be an empty string');
      }
      if (props.value.length > 500) {
        throw new Error('Return reason cannot exceed 500 characters');
      }
    }
  }

  public getValue(): string | null {
    return this.props.value;
  }

  public hasValue(): boolean {
    return this.props.value !== null && this.props.value !== undefined;
  }

  public equals(other?: ReturnReason): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
