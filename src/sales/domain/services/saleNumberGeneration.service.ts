import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';

export class SaleNumberGenerationService {
  /**
   * Generates the next sale number for the current year
   */
  public static async generateNextSaleNumber(
    orgId: string,
    repository: ISaleRepository
  ): Promise<SaleNumber> {
    const currentYear = new Date().getFullYear();

    // Get the last sale number for the current year
    const lastSaleNumber = await repository.getLastSaleNumberForYear(currentYear, orgId);

    let nextSequence = 1;

    if (lastSaleNumber) {
      try {
        const lastNumber = SaleNumber.fromString(lastSaleNumber);
        // Only use if it's from the same year
        if (lastNumber.getYear() === currentYear) {
          nextSequence = lastNumber.getSequence() + 1;
        }
      } catch (_error) {
        // If parsing fails, start from 1
        nextSequence = 1;
      }
    }

    // Validate sequence doesn't exceed max
    if (nextSequence > 999) {
      throw new Error(`Sale sequence for year ${currentYear} exceeds maximum (999)`);
    }

    return SaleNumber.create(currentYear, nextSequence);
  }
}
