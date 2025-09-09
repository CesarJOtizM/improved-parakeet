import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IMoneyProps {
  value: {
    amount: number;
    currency: string;
    precision: number;
  };
}

export class Money extends ValueObject<IMoneyProps> {
  constructor(props: IMoneyProps) {
    super(props);
    this.validate(props);
  }

  public static create(amount: number, currency: string = 'COP', precision: number = 2): Money {
    return new Money({ value: { amount, currency, precision } });
  }

  private validate(props: IMoneyProps): void {
    if (props.value.amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!props.value.currency || props.value.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (props.value.precision < 0 || props.value.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public add(money: Money): Money {
    if (this.props.value.currency !== money.props.value.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return Money.create(
      this.props.value.amount + money.props.value.amount,
      this.props.value.currency,
      this.props.value.precision
    );
  }

  public subtract(money: Money): Money {
    if (this.props.value.currency !== money.props.value.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }
    const result = this.props.value.amount - money.props.value.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return Money.create(result, this.props.value.currency, this.props.value.precision);
  }

  public multiply(factor: number): Money {
    return Money.create(
      this.props.value.amount * factor,
      this.props.value.currency,
      this.props.value.precision
    );
  }

  public divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return Money.create(
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
