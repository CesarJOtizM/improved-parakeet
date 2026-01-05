import {
  ExportReportUseCase,
  IExportReportRequest,
} from '@application/reportUseCases/exportReportUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

describe('ExportReportUseCase', () => {
  let useCase: ExportReportUseCase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExportService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReportRepository: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockEventDispatcher: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReportCacheService: any;

  beforeEach(() => {
    mockExportService = {
      exportReport: jest.fn(),
    };

    mockReportRepository = {
      save: jest.fn(),
    };

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
    };

    mockReportCacheService = {
      generateKey: jest.fn().mockReturnValue('cache-key-123'),
      get: jest.fn(),
      set: jest.fn(),
      getTtlForExport: jest.fn().mockReturnValue(3600),
    };

    useCase = new ExportReportUseCase(
      mockExportService,
      mockReportRepository,
      mockEventDispatcher,
      mockReportCacheService
    );
  });

  describe('execute', () => {
    it('Given: valid request When: exporting report Then: should return export data', async () => {
      // Arrange
      const exportResult = {
        buffer: Buffer.from('test data'),
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };
      mockReportCacheService.get.mockResolvedValue(null);
      mockExportService.exportReport.mockResolvedValue(exportResult);

      const request: IExportReportRequest = {
        type: 'VALUATION',
        format: 'PDF',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.success).toBe(true);
      expect(response.data.buffer).toEqual(exportResult.buffer);
      expect(response.data.filename).toBe('report.pdf');
      expect(response.fromCache).toBe(false);
    });

    it('Given: cached export When: exporting report Then: should return from cache', async () => {
      // Arrange
      const cachedResult = {
        buffer: Buffer.from('cached data'),
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 512,
      };
      mockReportCacheService.get.mockResolvedValue(cachedResult);

      const request: IExportReportRequest = {
        type: 'VALUATION',
        format: 'PDF',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.fromCache).toBe(true);
      expect(mockExportService.exportReport).not.toHaveBeenCalled();
    });

    it('Given: invalid report type When: exporting Then: should return ValidationError', async () => {
      // Arrange
      const request: IExportReportRequest = {
        type: 'INVALID_TYPE',
        format: 'PDF',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Invalid report type');
        }
      );
    });

    it('Given: invalid format When: exporting Then: should return ValidationError', async () => {
      // Arrange
      const request: IExportReportRequest = {
        type: 'VALUATION',
        format: 'INVALID_FORMAT',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Invalid export format');
        }
      );
    });

    it('Given: saveMetadata true When: exporting Then: should save report metadata', async () => {
      // Arrange
      const exportResult = {
        buffer: Buffer.from('test data'),
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };
      mockReportCacheService.get.mockResolvedValue(null);
      mockExportService.exportReport.mockResolvedValue(exportResult);

      const mockSavedReport = {
        id: 'report-123',
        domainEvents: [],
        markAsGenerating: jest.fn(),
        complete: jest.fn(),
        markAsExported: jest.fn(),
        markEventsForDispatch: jest.fn(),
        clearEvents: jest.fn(),
      };
      mockReportRepository.save.mockResolvedValue(mockSavedReport);

      const request: IExportReportRequest = {
        type: 'VALUATION',
        format: 'PDF',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
        saveMetadata: true,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data.reportId).toBe('report-123');
      expect(mockReportRepository.save).toHaveBeenCalled();
    });

    it('Given: export fails When: exporting Then: should return ValidationError', async () => {
      // Arrange
      mockReportCacheService.get.mockResolvedValue(null);
      mockExportService.exportReport.mockRejectedValue(new Error('Export failed'));

      const request: IExportReportRequest = {
        type: 'VALUATION',
        format: 'PDF',
        parameters: { dateRange: { startDate: new Date(), endDate: new Date() } },
        orgId: 'org-123',
        exportedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Export failed');
        }
      );
    });
  });
});
