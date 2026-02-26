import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface ISaleNumberProps {
  value: string;
}

export class SaleNumber extends ValueObject<ISaleNumberProps> {
  private constructor(props: ISaleNumberProps) {
    super(props);
    this.validate(props);
  }

  public static create(year: number, sequence: number): SaleNumber {
    if (year < 2000 || year > 9999) {
      throw new Error('Year must be between 2000 and 9999');
    }
    if (sequence < 1 || sequence > 999999) {
      throw new Error('Sequence must be between 1 and 999999');
    }
    const formattedSequence = String(sequence).padStart(3, '0');
    const value = `SALE-${year}-${formattedSequence}`;
    return new SaleNumber({ value });
  }

  public static fromString(value: string): SaleNumber {
    return new SaleNumber({ value });
  }

  private validate(props: ISaleNumberProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Sale number cannot be empty');
    }

    const trimmed = props.value.trim();
    const pattern = /^SALE-\d{4}-\d{3,6}$/;

    if (!pattern.test(trimmed)) {
      throw new Error('Sale number must match format SALE-YYYY-NNN');
    }

    const parts = trimmed.split('-');
    if (parts.length !== 3) {
      throw new Error('Sale number must have format SALE-YYYY-NNN');
    }

    const year = parseInt(parts[1], 10);
    if (isNaN(year) || year < 2000 || year > 9999) {
      throw new Error('Year in sale number must be between 2000 and 9999');
    }

    const sequence = parseInt(parts[2], 10);
    if (isNaN(sequence) || sequence < 1 || sequence > 999999) {
      throw new Error('Sequence in sale number must be between 001 and 999999');
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

  public equals(other?: SaleNumber): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
