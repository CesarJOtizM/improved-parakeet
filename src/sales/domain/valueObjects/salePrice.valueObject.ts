import { ValueObject } from '@shared/domain/base/valueObject.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

export interface ISalePriceProps {
  value: Money;
}

export class SalePrice extends ValueObject<ISalePriceProps> {
  private constructor(props: ISalePriceProps) {
    super(props);
    this.validate(props);
  }

  public static create(amount: number, currency: string = 'COP', precision: number = 2): SalePrice {
    const money = Money.create(amount, currency, precision);
    return new SalePrice({ value: money });
  }

  public static fromMoney(money: Money): SalePrice {
    return new SalePrice({ value: money });
  }

  private validate(props: ISalePriceProps): void {
    if (!props.value) {
      throw new Error('Sale price cannot be null or undefined');
    }
    if (!props.value.isPositive()) {
      throw new Error('Sale price must be positive');
    }
  }

  public getValue(): Money {
    return this.props.value;
  }

  public getAmount(): number {
    return this.props.value.getAmount();
  }

  public getCurrency(): string {
    return this.props.value.getCurrency();
  }

  public getPrecision(): number {
    return this.props.value.getPrecision();
  }

  public multiply(factor: number): SalePrice {
    return SalePrice.fromMoney(this.props.value.multiply(factor));
  }

  public equals(other?: SalePrice): boolean {
    if (!other) {
      return false;
    }
    return (
      this.props.value.getAmount() === other.props.value.getAmount() &&
      this.props.value.getCurrency() === other.props.value.getCurrency()
    );
  }
}
