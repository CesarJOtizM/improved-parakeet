import { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';

export class ReturnNumberGenerationService {
  /**
   * Generates the next return number for the current year using database sequence
   * This method is atomic and prevents race conditions
   */
  public static async generateNextReturnNumber(
    orgId: string,
    repository: IReturnRepository
  ): Promise<ReturnNumber> {
    const currentYear = new Date().getFullYear();

    // Get the next return number atomically from the database
    const returnNumber = await repository.getNextReturnNumber(orgId, currentYear);

    return ReturnNumber.fromString(returnNumber);
  }
}
