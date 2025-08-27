import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface MoneyProps {
  amount: number;
  currency: string;
  precision: number;
}

export class Money extends ValueObject<MoneyProps> {
  constructor(props: MoneyProps) {
    super(props);
    this.validate(props);
  }

  public static create(amount: number, currency: string = 'COP', precision: number = 2): Money {
    return new Money({ amount, currency, precision });
  }

  private validate(props: MoneyProps): void {
    if (props.amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (props.precision < 0 || props.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public add(money: Money): Money {
    if (this.props.currency !== money.props.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return Money.create(
      this.props.amount + money.props.amount,
      this.props.currency,
      this.props.precision
    );
  }

  public subtract(money: Money): Money {
    if (this.props.currency !== money.props.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    const result = this.props.amount - money.props.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return Money.create(result, this.props.currency, this.props.precision);
  }

  public multiply(factor: number): Money {
    return Money.create(this.props.amount * factor, this.props.currency, this.props.precision);
  }

  public divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return Money.create(this.props.amount / divisor, this.props.currency, this.props.precision);
  }

  public isZero(): boolean {
    return this.props.amount === 0;
  }

  public isPositive(): boolean {
    return this.props.amount > 0;
  }

  public getAmount(): number {
    return this.props.amount;
  }

  public getCurrency(): string {
    return this.props.currency;
  }

  public getPrecision(): number {
    return this.props.precision;
  }

  public toFixed(): string {
    return this.props.amount.toFixed(this.props.precision);
  }

  public format(): string {
    return `${this.props.currency} ${this.toFixed()}`;
  }
}
