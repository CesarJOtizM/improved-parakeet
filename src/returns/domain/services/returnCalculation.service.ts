// Return Calculation Service - Pure Functions
// Pure functions for return calculations without side effects

import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

/**
 * Calculates subtotal from return lines
 * Pure function - no side effects
 */
export function calculateReturnSubtotal(lines: ReturnLine[]): Money | null {
  if (lines.length === 0) {
    return null;
  }

  let subtotal: Money | null = null;

  for (const line of lines) {
    const lineTotal = line.getTotalPrice();
    if (lineTotal) {
      if (subtotal === null) {
        subtotal = lineTotal;
      } else {
        if (lineTotal.getCurrency() !== subtotal.getCurrency()) {
          throw new Error('All lines must have the same currency');
        }
        subtotal = subtotal.add(lineTotal);
      }
    }
  }

  return subtotal;
}

/**
 * Calculates total with optional adjustments
 * Pure function - no side effects
 */
export function calculateReturnTotal(subtotal: Money | null, adjustments?: Money): Money | null {
  if (subtotal === null) {
    return null;
  }

  if (!adjustments) {
    return subtotal;
  }

  if (adjustments.getCurrency() !== subtotal.getCurrency()) {
    throw new Error('Adjustment currency must match subtotal currency');
  }

  return subtotal.add(adjustments);
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use pure functions calculateReturnSubtotal and calculateReturnTotal instead
 */
export class ReturnCalculationService {
  /**
   * @deprecated Use calculateReturnSubtotal instead
   */
  public static calculateSubtotal(lines: ReturnLine[]): Money | null {
    return calculateReturnSubtotal(lines);
  }

  /**
   * @deprecated Use calculateReturnTotal instead
   */
  public static calculateTotal(subtotal: Money | null, adjustments?: Money): Money | null {
    return calculateReturnTotal(subtotal, adjustments);
  }
}
