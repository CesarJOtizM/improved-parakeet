import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

export class ReturnCalculationService {
  /**
   * Calculates subtotal from return lines
   */
  public static calculateSubtotal(lines: ReturnLine[]): Money | null {
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
   */
  public static calculateTotal(subtotal: Money | null, adjustments?: Money): Money | null {
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
}
