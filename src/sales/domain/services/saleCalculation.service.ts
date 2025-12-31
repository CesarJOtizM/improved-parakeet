// Sale Calculation Service - Pure Functions
// Pure functions for sale calculations without side effects

import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

/**
 * Calculates subtotal from sale lines
 * Pure function - no side effects
 */
export function calculateSaleSubtotal(lines: SaleLine[]): Money {
  if (lines.length === 0) {
    return Money.create(0, 'COP', 2);
  }

  let subtotal = Money.create(0, lines[0].salePrice.getCurrency(), 2);

  for (const line of lines) {
    const lineTotal = line.getTotalPrice();
    if (lineTotal.getCurrency() !== subtotal.getCurrency()) {
      throw new Error('All lines must have the same currency');
    }
    subtotal = subtotal.add(lineTotal);
  }

  return subtotal;
}

/**
 * Calculates total with optional discounts and taxes
 * Pure function - no side effects
 */
export function calculateSaleTotal(subtotal: Money, discounts?: Money, taxes?: Money): Money {
  let total = subtotal;

  if (discounts) {
    if (discounts.getCurrency() !== total.getCurrency()) {
      throw new Error('Discount currency must match subtotal currency');
    }
    total = total.subtract(discounts);
  }

  if (taxes) {
    if (taxes.getCurrency() !== total.getCurrency()) {
      throw new Error('Tax currency must match subtotal currency');
    }
    total = total.add(taxes);
  }

  return total;
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use pure functions calculateSaleSubtotal and calculateSaleTotal instead
 */
export class SaleCalculationService {
  /**
   * @deprecated Use calculateSaleSubtotal instead
   */
  public static calculateSubtotal(lines: SaleLine[]): Money {
    return calculateSaleSubtotal(lines);
  }

  /**
   * @deprecated Use calculateSaleTotal instead
   */
  public static calculateTotal(subtotal: Money, discounts?: Money, taxes?: Money): Money {
    return calculateSaleTotal(subtotal, discounts, taxes);
  }
}
