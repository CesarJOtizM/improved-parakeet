import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IUnitCostProps {
  value: {
    amount: number;
    currency: string;
    precision: number;
  };
}

export class UnitCost extends ValueObject<IUnitCostProps> {
  constructor(props: IUnitCostProps) {
    super(props);
    this.validate(props);
  }

  public static create(amount: number, currency: string = 'COP', precision: number = 2): UnitCost {
    return new UnitCost({ value: { amount, currency, precision } });
  }

  private validate(props: IUnitCostProps): void {
    if (props.value.amount < 0) {
      throw new Error('Unit cost cannot be negative');
    }
    if (!props.value.currency || props.value.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (props.value.precision < 0 || props.value.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public add(unitCost: UnitCost): UnitCost {
    if (this.props.value.currency !== unitCost.props.value.currency) {
      throw new Error('Cannot add unit costs with different currencies');
    }
    return UnitCost.create(
      this.props.value.amount + unitCost.props.value.amount,
      this.props.value.currency,
      this.props.value.precision
    );
  }

  public subtract(unitCost: UnitCost): UnitCost {
    if (this.props.value.currency !== unitCost.props.value.currency) {
      throw new Error('Cannot subtract unit costs with different currencies');
    }
    const result = this.props.value.amount - unitCost.props.value.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return UnitCost.create(result, this.props.value.currency, this.props.value.precision);
  }

  public multiply(factor: number): UnitCost {
    return UnitCost.create(
      this.props.value.amount * factor,
      this.props.value.currency,
      this.props.value.precision
    );
  }

  public divide(divisor: number): UnitCost {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return UnitCost.create(
      this.props.value.amount / divisor,
      this.props.value.currency,
      this.props.value.precision
    );
  }

  public isZero(): boolean {
    return this.props.value.amount === 0;
  }

  public isPositive(): boolean {
    return this.props.value.amount > 0;
  }

  public getAmount(): number {
    return this.props.value.amount;
  }

  public getCurrency(): string {
    return this.props.value.currency;
  }

  public getPrecision(): number {
    return this.props.value.precision;
  }

  public toFixed(): string {
    return this.props.value.amount.toFixed(this.props.value.precision);
  }

  public format(): string {
    return `${this.props.value.currency} ${this.toFixed()}`;
  }
}
