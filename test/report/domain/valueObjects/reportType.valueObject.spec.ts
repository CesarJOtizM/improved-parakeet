// ReportType Value Object Tests
// Unit tests for ReportType following AAA and Given-When-Then pattern

import { REPORT_TYPES, ReportType } from '@report/domain/valueObjects';

describe('ReportType Value Object', () => {
  describe('create', () => {
    it('Given: valid report type When: creating ReportType Then: should create instance', () => {
      // Arrange
      const value = REPORT_TYPES.AVAILABLE_INVENTORY;

      // Act
      const reportType = ReportType.create(value);

      // Assert
      expect(reportType).toBeDefined();
      expect(reportType.getValue()).toBe(value);
    });

    it('Given: all valid report types When: creating each Then: should create all successfully', () => {
      // Arrange
      const validTypes = Object.values(REPORT_TYPES);

      // Act & Assert
      for (const type of validTypes) {
        const reportType = ReportType.create(type);
        expect(reportType.getValue()).toBe(type);
      }
    });

    it('Given: empty string When: creating ReportType Then: should throw error', () => {
      // Arrange
      const value = '';

      // Act & Assert
      expect(() => ReportType.create(value)).toThrow('Report type cannot be empty');
    });

    it('Given: invalid report type When: creating ReportType Then: should throw error', () => {
      // Arrange
      const value = 'INVALID_TYPE';

      // Act & Assert
      expect(() => ReportType.create(value)).toThrow('Invalid report type');
    });
  });

  describe('getValue', () => {
    it('Given: ReportType instance When: getting value Then: should return correct value', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.SALES);

      // Act
      const value = reportType.getValue();

      // Assert
      expect(value).toBe(REPORT_TYPES.SALES);
    });
  });

  describe('toString', () => {
    it('Given: ReportType instance When: converting to string Then: should return value', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.RETURNS);

      // Act
      const result = reportType.toString();

      // Assert
      expect(result).toBe(REPORT_TYPES.RETURNS);
    });
  });

  describe('equals', () => {
    it('Given: two ReportTypes with same value When: comparing Then: should be equal', () => {
      // Arrange
      const reportType1 = ReportType.create(REPORT_TYPES.VALUATION);
      const reportType2 = ReportType.create(REPORT_TYPES.VALUATION);

      // Act
      const result = reportType1.equals(reportType2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two ReportTypes with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const reportType1 = ReportType.create(REPORT_TYPES.SALES);
      const reportType2 = ReportType.create(REPORT_TYPES.RETURNS);

      // Act
      const result = reportType1.equals(reportType2);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: ReportType and undefined When: comparing Then: should return false', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.FINANCIAL);

      // Act
      const result = reportType.equals(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isInventoryReport', () => {
    it('Given: inventory report type When: checking isInventoryReport Then: should return true', () => {
      // Arrange
      const inventoryTypes = [
        REPORT_TYPES.AVAILABLE_INVENTORY,
        REPORT_TYPES.MOVEMENT_HISTORY,
        REPORT_TYPES.VALUATION,
        REPORT_TYPES.LOW_STOCK,
        REPORT_TYPES.MOVEMENTS,
        REPORT_TYPES.FINANCIAL,
        REPORT_TYPES.TURNOVER,
      ];

      // Act & Assert
      for (const type of inventoryTypes) {
        const reportType = ReportType.create(type);
        expect(reportType.isInventoryReport()).toBe(true);
      }
    });

    it('Given: non-inventory report type When: checking isInventoryReport Then: should return false', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.SALES);

      // Act
      const result = reportType.isInventoryReport();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isSalesReport', () => {
    it('Given: sales report type When: checking isSalesReport Then: should return true', () => {
      // Arrange
      const salesTypes = [
        REPORT_TYPES.SALES,
        REPORT_TYPES.SALES_BY_PRODUCT,
        REPORT_TYPES.SALES_BY_WAREHOUSE,
      ];

      // Act & Assert
      for (const type of salesTypes) {
        const reportType = ReportType.create(type);
        expect(reportType.isSalesReport()).toBe(true);
      }
    });

    it('Given: non-sales report type When: checking isSalesReport Then: should return false', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.RETURNS);

      // Act
      const result = reportType.isSalesReport();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isReturnsReport', () => {
    it('Given: returns report type When: checking isReturnsReport Then: should return true', () => {
      // Arrange
      const returnsTypes = [
        REPORT_TYPES.RETURNS,
        REPORT_TYPES.RETURNS_BY_TYPE,
        REPORT_TYPES.RETURNS_BY_PRODUCT,
      ];

      // Act & Assert
      for (const type of returnsTypes) {
        const reportType = ReportType.create(type);
        expect(reportType.isReturnsReport()).toBe(true);
      }
    });

    it('Given: non-returns report type When: checking isReturnsReport Then: should return false', () => {
      // Arrange
      const reportType = ReportType.create(REPORT_TYPES.SALES);

      // Act
      const result = reportType.isReturnsReport();

      // Assert
      expect(result).toBe(false);
    });
  });
});
