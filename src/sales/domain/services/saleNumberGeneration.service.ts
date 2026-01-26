import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';

export class SaleNumberGenerationService {
  /**
   * Generates the next sale number for the current year using database sequence
   * This method is atomic and prevents race conditions
   */
  public static async generateNextSaleNumber(
    orgId: string,
    repository: ISaleRepository
  ): Promise<SaleNumber> {
    const currentYear = new Date().getFullYear();

    // Get the next sale number atomically from the database
    const saleNumber = await repository.getNextSaleNumber(orgId, currentYear);

    return SaleNumber.fromString(saleNumber);
  }
}
