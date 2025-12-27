// ViewReportUseCase Tests
// Unit tests for ViewReportUseCase following AAA and Given-When-Then pattern

import { ViewReportUseCase } from '@application/reportUseCases';
import { Test, TestingModule } from '@nestjs/testing';
import { IReportViewResult, ReportViewService } from '@report/domain/services';
import { REPORT_TYPES } from '@report/domain/valueObjects';

describe('ViewReportUseCase', () => {
  let useCase: ViewReportUseCase;
  let mockReportViewService: jest.Mocked<ReportViewService>;

  beforeEach(async () => {
    mockReportViewService = {
      viewReport: jest.fn(),
    } as unknown as jest.Mocked<ReportViewService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewReportUseCase,
        {
          provide: ReportViewService,
          useValue: mockReportViewService,
        },
      ],
    }).compile();

    useCase = module.get<ViewReportUseCase>(ViewReportUseCase);
  });

  describe('execute', () => {
    it('Given: valid request When: executing Then: should return Ok result', async () => {
      // Arrange
      const request = {
        type: REPORT_TYPES.SALES,
        parameters: { warehouseId: 'warehouse-123' },
        orgId: 'org-123',
        viewedBy: 'user-123',
      };

      const mockViewResult: IReportViewResult<unknown> = {
        columns: [{ key: 'saleId', header: 'Sale ID', type: 'string' }],
        rows: [{ saleId: 'sale-1' }],
        metadata: {
          reportType: REPORT_TYPES.SALES,
          reportTitle: 'Sales Report',
          generatedAt: new Date(),
          parameters: request.parameters,
          totalRecords: 1,
          orgId: request.orgId,
        },
      };

      mockReportViewService.viewReport.mockResolvedValue(mockViewResult);

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Report generated successfully');
          expect(value.data).toEqual(mockViewResult);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: invalid report type When: executing Then: should return Err result', async () => {
      // Arrange
      const request = {
        type: 'INVALID_TYPE',
        parameters: {},
        orgId: 'org-123',
        viewedBy: 'user-123',
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
          expect(error.message).toContain('Invalid report type');
        }
      );
    });

    it('Given: service throws error When: executing Then: should return Err result', async () => {
      // Arrange
      const request = {
        type: REPORT_TYPES.SALES,
        parameters: {},
        orgId: 'org-123',
        viewedBy: 'user-123',
      };

      mockReportViewService.viewReport.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toBe('Database connection failed');
        }
      );
    });

    it('Given: request with all parameters When: executing Then: should pass parameters to service', async () => {
      // Arrange
      const request = {
        type: REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters: {
          warehouseId: 'warehouse-123',
          productId: 'product-456',
          includeInactive: true,
        },
        orgId: 'org-123',
        viewedBy: 'user-123',
      };

      const mockViewResult: IReportViewResult<unknown> = {
        columns: [],
        rows: [],
        metadata: {
          reportType: REPORT_TYPES.AVAILABLE_INVENTORY,
          reportTitle: 'Available Inventory Report',
          generatedAt: new Date(),
          parameters: request.parameters,
          totalRecords: 0,
          orgId: request.orgId,
        },
      };

      mockReportViewService.viewReport.mockResolvedValue(mockViewResult);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockReportViewService.viewReport).toHaveBeenCalledWith(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        request.parameters,
        request.orgId
      );
    });
  });
});
