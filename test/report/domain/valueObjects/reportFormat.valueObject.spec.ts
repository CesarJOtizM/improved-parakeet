// ReportFormat Value Object Tests
// Unit tests for ReportFormat following AAA and Given-When-Then pattern

import { REPORT_FORMATS, ReportFormat } from '@report/domain/valueObjects';

describe('ReportFormat Value Object', () => {
  describe('create', () => {
    it('Given: valid format When: creating ReportFormat Then: should create instance', () => {
      // Arrange
      const value = REPORT_FORMATS.PDF;

      // Act
      const format = ReportFormat.create(value);

      // Assert
      expect(format).toBeDefined();
      expect(format.getValue()).toBe(value);
    });

    it('Given: lowercase format When: creating ReportFormat Then: should convert to uppercase', () => {
      // Arrange
      const value = 'pdf';

      // Act
      const format = ReportFormat.create(value);

      // Assert
      expect(format.getValue()).toBe(REPORT_FORMATS.PDF);
    });

    it('Given: empty string When: creating ReportFormat Then: should throw error', () => {
      // Arrange
      const value = '';

      // Act & Assert
      expect(() => ReportFormat.create(value)).toThrow('Report format cannot be empty');
    });

    it('Given: invalid format When: creating ReportFormat Then: should throw error', () => {
      // Arrange
      const value = 'INVALID';

      // Act & Assert
      expect(() => ReportFormat.create(value)).toThrow('Invalid report format');
    });
  });

  describe('isExportFormat', () => {
    it('Given: PDF format When: checking isExportFormat Then: should return true', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.PDF);

      // Act
      const result = format.isExportFormat();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: EXCEL format When: checking isExportFormat Then: should return true', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.EXCEL);

      // Act
      const result = format.isExportFormat();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: CSV format When: checking isExportFormat Then: should return true', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.CSV);

      // Act
      const result = format.isExportFormat();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: JSON format When: checking isExportFormat Then: should return false', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.JSON);

      // Act
      const result = format.isExportFormat();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('Given: PDF format When: getting mime type Then: should return application/pdf', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.PDF);

      // Act
      const mimeType = format.getMimeType();

      // Assert
      expect(mimeType).toBe('application/pdf');
    });

    it('Given: EXCEL format When: getting mime type Then: should return Excel mime type', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.EXCEL);

      // Act
      const mimeType = format.getMimeType();

      // Assert
      expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('Given: CSV format When: getting mime type Then: should return text/csv', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.CSV);

      // Act
      const mimeType = format.getMimeType();

      // Assert
      expect(mimeType).toBe('text/csv');
    });

    it('Given: JSON format When: getting mime type Then: should return application/json', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.JSON);

      // Act
      const mimeType = format.getMimeType();

      // Assert
      expect(mimeType).toBe('application/json');
    });
  });

  describe('getFileExtension', () => {
    it('Given: PDF format When: getting extension Then: should return .pdf', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.PDF);

      // Act
      const extension = format.getFileExtension();

      // Assert
      expect(extension).toBe('.pdf');
    });

    it('Given: EXCEL format When: getting extension Then: should return .xlsx', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.EXCEL);

      // Act
      const extension = format.getFileExtension();

      // Assert
      expect(extension).toBe('.xlsx');
    });

    it('Given: CSV format When: getting extension Then: should return .csv', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.CSV);

      // Act
      const extension = format.getFileExtension();

      // Assert
      expect(extension).toBe('.csv');
    });

    it('Given: JSON format When: getting extension Then: should return .json', () => {
      // Arrange
      const format = ReportFormat.create(REPORT_FORMATS.JSON);

      // Act
      const extension = format.getFileExtension();

      // Assert
      expect(extension).toBe('.json');
    });
  });

  describe('equals', () => {
    it('Given: two formats with same value When: comparing Then: should be equal', () => {
      // Arrange
      const format1 = ReportFormat.create(REPORT_FORMATS.PDF);
      const format2 = ReportFormat.create(REPORT_FORMATS.PDF);

      // Act
      const result = format1.equals(format2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two formats with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const format1 = ReportFormat.create(REPORT_FORMATS.PDF);
      const format2 = ReportFormat.create(REPORT_FORMATS.CSV);

      // Act
      const result = format1.equals(format2);

      // Assert
      expect(result).toBe(false);
    });
  });
});
