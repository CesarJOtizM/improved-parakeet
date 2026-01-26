import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import { SaleNumberGenerationService } from '@sale/domain/services/saleNumberGeneration.service';

describe('SaleNumberGenerationService', () => {
  const mockOrgId = 'org-123';
  let mockRepository: jest.Mocked<ISaleRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      findBySaleNumber: jest.fn(),
      getLastSaleNumberForYear: jest.fn(),
      getNextSaleNumber: jest.fn(),
      addLine: jest.fn(),
    } as unknown as jest.Mocked<ISaleRepository>;
  });

  describe('generateNextSaleNumber', () => {
    it('Given: no existing sales for the year When: generating next sale number Then: should return sequence 001', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-001`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-001`);
      expect(mockRepository.getNextSaleNumber).toHaveBeenCalledWith(mockOrgId, currentYear);
    });

    it('Given: existing sale number 001 for the year When: generating next sale number Then: should return sequence 002', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-002`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-002`);
    });

    it('Given: existing sale number 500 for the year When: generating next sale number Then: should return sequence 501', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-501`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-501`);
    });

    it('Given: sequence at 999 When: generating next sale number Then: should return sequence 999', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-999`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-999`);
    });

    it('Given: repository throws error When: generating next sale number Then: should propagate error', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockRejectedValue(
        new Error(`Sale sequence for year ${currentYear} exceeds maximum (999)`)
      );

      // Act & Assert
      await expect(
        SaleNumberGenerationService.generateNextSaleNumber(mockOrgId, mockRepository)
      ).rejects.toThrow(`Sale sequence for year ${currentYear} exceeds maximum (999)`);
    });

    it('Given: sale number with leading zeros When: generating next sale number Then: should handle correctly', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-010`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-010`);
    });

    it('Given: sale number with mid-range sequence When: generating next sale number Then: should format with leading zeros', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      mockRepository.getNextSaleNumber.mockResolvedValue(`SALE-${currentYear}-100`);

      // Act
      const result = await SaleNumberGenerationService.generateNextSaleNumber(
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.getValue()).toBe(`SALE-${currentYear}-100`);
    });
  });
});
