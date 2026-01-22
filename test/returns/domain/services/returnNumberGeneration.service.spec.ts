import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import { ReturnNumberGenerationService } from '@returns/domain/services/returnNumberGeneration.service';

describe('ReturnNumberGenerationService', () => {
  const mockOrgId = 'org-123';
  let mockRepository: jest.Mocked<IReturnRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      findByReturnNumber: jest.fn(),
      getLastReturnNumberForYear: jest.fn(),
    } as unknown as jest.Mocked<IReturnRepository>;
  });

  describe('generateNextReturnNumber', () => {
    it('Given: no existing returns for the year When: generating next return number Then: should return sequence 001', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(null);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-001`);
      expect(mockRepository.getLastReturnNumberForYear).toHaveBeenCalledWith(
        currentYear,
        mockOrgId
      );
    });

    it('Given: existing return number 001 for the year When: generating next return number Then: should return sequence 002', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-001`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-002`);
    });

    it('Given: existing return number 500 for the year When: generating next return number Then: should return sequence 501', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-500`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-501`);
    });

    it('Given: existing return number from different year When: generating next return number Then: should return sequence 001', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${lastYear}-999`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-001`);
    });

    it('Given: invalid return number format in repository When: generating next return number Then: should return sequence 001', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue('INVALID-FORMAT');

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-001`);
    });

    it('Given: sequence at 999 When: generating next return number Then: should throw error', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-999`);

      // Act & Assert
      await expect(
        ReturnNumberGenerationService.generateNextReturnNumber(mockOrgId, mockRepository)
      ).rejects.toThrow(`Return sequence for year ${currentYear} exceeds maximum (999)`);
    });

    it('Given: sequence at 998 When: generating next return number Then: should return sequence 999', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-998`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-999`);
    });

    it('Given: return number with leading zeros When: generating next return number Then: should handle correctly', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-009`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-010`);
    });

    it('Given: return number with mid-range sequence When: generating next return number Then: should format with leading zeros', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getLastReturnNumberForYear.mockResolvedValue(`RETURN-${currentYear}-099`);

      // Act
      const result = await ReturnNumberGenerationService.generateNextReturnNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`RETURN-${currentYear}-100`);
    });
  });
});
