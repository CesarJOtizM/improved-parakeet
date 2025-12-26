import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IReturnNumberProps {
  value: string;
}

export class ReturnNumber extends ValueObject<IReturnNumberProps> {
  private constructor(props: IReturnNumberProps) {
    super(props);
    this.validate(props);
  }

  public static create(year: number, sequence: number): ReturnNumber {
    if (year < 2000 || year > 9999) {
      throw new Error('Year must be between 2000 and 9999');
    }
    if (sequence < 1 || sequence > 999) {
      throw new Error('Sequence must be between 1 and 999');
    }
    const formattedSequence = String(sequence).padStart(3, '0');
    const value = `RETURN-${year}-${formattedSequence}`;
    return new ReturnNumber({ value });
  }

  public static fromString(value: string): ReturnNumber {
    return new ReturnNumber({ value });
  }

  private validate(props: IReturnNumberProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Return number cannot be empty');
    }

    const trimmed = props.value.trim();
    const pattern = /^RETURN-\d{4}-\d{3}$/;

    if (!pattern.test(trimmed)) {
      throw new Error('Return number must match format RETURN-YYYY-NNN');
    }

    const parts = trimmed.split('-');
    if (parts.length !== 3) {
      throw new Error('Return number must have format RETURN-YYYY-NNN');
    }

    const year = parseInt(parts[1], 10);
    if (isNaN(year) || year < 2000 || year > 9999) {
      throw new Error('Year in return number must be between 2000 and 9999');
    }

    const sequence = parseInt(parts[2], 10);
    if (isNaN(sequence) || sequence < 1 || sequence > 999) {
      throw new Error('Sequence in return number must be between 001 and 999');
    }
  }

  public getValue(): string {
    return this.props.value;
  }

  public getYear(): number {
    const parts = this.props.value.split('-');
    return parseInt(parts[1], 10);
  }

  public getSequence(): number {
    const parts = this.props.value.split('-');
    return parseInt(parts[2], 10);
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ReturnNumber): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
