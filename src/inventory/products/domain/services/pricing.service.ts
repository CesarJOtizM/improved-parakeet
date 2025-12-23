import { Money } from '@stock/domain/valueObjects/money.valueObject';

export class PricingService {
  /**
   * Calculates price with tax
   */
  public static calculatePriceWithTax(basePrice: Money, taxRate: number): Money {
    if (taxRate < 0 || taxRate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
    }

    const taxAmount = basePrice.getAmount() * (taxRate / 100);
    return Money.create(
      basePrice.getAmount() + taxAmount,
      basePrice.getCurrency(),
      basePrice.getPrecision()
    );
  }

  /**
   * Calculates discount amount
   */
  public static calculateDiscount(price: Money, discountPercent: number): Money {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    const discountAmount = price.getAmount() * (discountPercent / 100);
    return Money.create(discountAmount, price.getCurrency(), price.getPrecision());
  }

  /**
   * Calculates final price with tax and discount
   */
  public static calculateFinalPrice(
    basePrice: Money,
    taxRate: number,
    discountPercent: number
  ): Money {
    if (taxRate < 0 || taxRate > 100) {
      throw new Error('Tax rate must be between 0 and 100');
    }

    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    // Apply discount first
    const discountAmount = basePrice.getAmount() * (discountPercent / 100);
    const priceAfterDiscount = basePrice.getAmount() - discountAmount;

    // Apply tax to discounted price
    const taxAmount = priceAfterDiscount * (taxRate / 100);
    const finalPrice = priceAfterDiscount + taxAmount;

    return Money.create(finalPrice, basePrice.getCurrency(), basePrice.getPrecision());
  }

  /**
   * Compares two prices
   * Returns: -1 if price1 < price2, 0 if equal, 1 if price1 > price2
   */
  public static comparePrices(price1: Money, price2: Money): number {
    if (price1.getCurrency() !== price2.getCurrency()) {
      throw new Error('Cannot compare prices with different currencies');
    }

    const amount1 = price1.getAmount();
    const amount2 = price2.getAmount();

    if (amount1 < amount2) {
      return -1;
    }

    if (amount1 > amount2) {
      return 1;
    }

    return 0;
  }
}
