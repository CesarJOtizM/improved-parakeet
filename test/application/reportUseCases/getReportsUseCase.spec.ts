import {
  GetReportsUseCase,
  IGetReportsRequest,
} from '@application/reportUseCases/getReportsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Report } from '@report/domain/entities/report.entity';
import { ReportParameters } from '@report/domain/valueObjects/reportParameters.valueObject';
import { ReportStatus } from '@report/domain/valueObjects/reportStatus.valueObject';
import { ReportType } from '@report/domain/valueObjects/reportType.valueObject';

describe('GetReportsUseCase', () => {
  let useCase: GetReportsUseCase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReportRepository: any;

  const createMockReport = (id: string, type: string, status: string, generatedBy: string) => {
    return {
      id,
      type: ReportType.create(type),
      status: ReportStatus.create(status),
      parameters: ReportParameters.create({
        dateRange: { startDate: new Date(), endDate: new Date() },
      }),
      generatedBy,
      generatedAt: new Date(),
      orgId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Report;
  };

  // Valid report types: AVAILABLE_INVENTORY, MOVEMENT_HISTORY, VALUATION, LOW_STOCK, MOVEMENTS, FINANCIAL, TURNOVER, SALES, SALES_BY_PRODUCT, SALES_BY_WAREHOUSE, RETURNS, RETURNS_BY_TYPE, RETURNS_BY_PRODUCT, RETURNS_BY_SALE, RETURNS_CUSTOMER, RETURNS_SUPPLIER

  beforeEach(() => {
    mockReportRepository = {
      findAll: jest.fn(),
      findByType: jest.fn(),
      findByStatus: jest.fn(),
      findByGeneratedBy: jest.fn(),
      findByDateRange: jest.fn(),
    };

    useCase = new GetReportsUseCase(mockReportRepository);
  });

  describe('execute', () => {
    it('Given: no filters When: getting reports Then: should return all reports', async () => {
      // Arrange
      const reports = [
        createMockReport('report-1', 'VALUATION', 'COMPLETED', 'user-1'),
        createMockReport('report-2', 'MOVEMENTS', 'COMPLETED', 'user-2'),
      ];
      mockReportRepository.findAll.mockResolvedValue(reports);

      const request: IGetReportsRequest = { orgId: 'org-123' };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(mockReportRepository.findAll).toHaveBeenCalledWith('org-123');
    });

    it('Given: type filter When: getting reports Then: should return reports by type', async () => {
      // Arrange
      const reports = [createMockReport('report-1', 'VALUATION', 'COMPLETED', 'user-1')];
      mockReportRepository.findByType.mockResolvedValue(reports);

      const request: IGetReportsRequest = { orgId: 'org-123', type: 'VALUATION' };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data).toHaveLength(1);
      expect(mockReportRepository.findByType).toHaveBeenCalledWith('VALUATION', 'org-123');
    });

    it('Given: status filter When: getting reports Then: should return reports by status', async () => {
      // Arrange
      const reports = [createMockReport('report-1', 'VALUATION', 'PENDING', 'user-1')];
      mockReportRepository.findByStatus.mockResolvedValue(reports);

      const request: IGetReportsRequest = { orgId: 'org-123', status: 'PENDING' };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data).toHaveLength(1);
      expect(mockReportRepository.findByStatus).toHaveBeenCalledWith('PENDING', 'org-123');
    });

    it('Given: generatedBy filter When: getting reports Then: should return reports by generator', async () => {
      // Arrange
      const reports = [createMockReport('report-1', 'VALUATION', 'COMPLETED', 'user-1')];
      mockReportRepository.findByGeneratedBy.mockResolvedValue(reports);

      const request: IGetReportsRequest = { orgId: 'org-123', generatedBy: 'user-1' };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data).toHaveLength(1);
      expect(mockReportRepository.findByGeneratedBy).toHaveBeenCalledWith('user-1', 'org-123');
    });

    it('Given: date range filter When: getting reports Then: should return reports in range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const reports = [createMockReport('report-1', 'VALUATION', 'COMPLETED', 'user-1')];
      mockReportRepository.findByDateRange.mockResolvedValue(reports);

      const request: IGetReportsRequest = { orgId: 'org-123', startDate, endDate };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data).toHaveLength(1);
      expect(mockReportRepository.findByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
        'org-123'
      );
    });

    it('Given: multiple filters When: getting reports Then: should apply additional filters', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const reports = [
        createMockReport('report-1', 'VALUATION', 'COMPLETED', 'user-1'),
        createMockReport('report-2', 'MOVEMENTS', 'COMPLETED', 'user-1'),
      ];
      mockReportRepository.findByDateRange.mockResolvedValue(reports);

      const request: IGetReportsRequest = {
        orgId: 'org-123',
        startDate,
        endDate,
        type: 'VALUATION',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.data).toHaveLength(1);
    });
  });
});
