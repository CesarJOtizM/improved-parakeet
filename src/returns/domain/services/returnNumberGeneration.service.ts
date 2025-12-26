import { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';

export class ReturnNumberGenerationService {
  /**
   * Generates the next return number for the current year
   */
  public static async generateNextReturnNumber(
    orgId: string,
    repository: IReturnRepository
  ): Promise<ReturnNumber> {
    const currentYear = new Date().getFullYear();

    // Get the last return number for the current year
    const lastReturnNumber = await repository.getLastReturnNumberForYear(currentYear, orgId);

    let nextSequence = 1;

    if (lastReturnNumber) {
      try {
        const lastNumber = ReturnNumber.fromString(lastReturnNumber);
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
      throw new Error(`Return sequence for year ${currentYear} exceeds maximum (999)`);
    }

    return ReturnNumber.create(currentYear, nextSequence);
  }
}
