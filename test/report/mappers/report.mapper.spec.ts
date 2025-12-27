// ReportMapper Tests
// Unit tests for ReportMapper following AAA and Given-When-Then pattern

import { Report } from '@report/domain/entities/report.entity';
import {
  ReportParameters,
  ReportStatus,
  ReportType,
  REPORT_STATUSES,
  REPORT_TYPES,
} from '@report/domain/valueObjects';
import { IReportCreateInput, ReportMapper } from '@report/mappers';

describe('ReportMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid input When: converting to domain props Then: should create Value Objects', () => {
      // Arrange
      const input: IReportCreateInput = {
        type: REPORT_TYPES.SALES,
        parameters: { warehouseId: 'warehouse-123' },
        generatedBy: 'user-123',
      };

      // Act
      const props = ReportMapper.toDomainProps(input);

      // Assert
      expect(props.type).toBeInstanceOf(ReportType);
      expect(props.type.getValue()).toBe(REPORT_TYPES.SALES);
      expect(props.status).toBeInstanceOf(ReportStatus);
      expect(props.status.getValue()).toBe(REPORT_STATUSES.PENDING);
      expect(props.parameters).toBeInstanceOf(ReportParameters);
      expect(props.parameters.getWarehouseId()).toBe('warehouse-123');
      expect(props.generatedBy).toBe('user-123');
    });

    it('Given: input with templateId When: converting Then: should include templateId', () => {
      // Arrange
      const input: IReportCreateInput = {
        type: REPORT_TYPES.RETURNS,
        parameters: {},
        generatedBy: 'user-123',
        templateId: 'template-123',
      };

      // Act
      const props = ReportMapper.toDomainProps(input);

      // Assert
      expect(props.templateId).toBe('template-123');
    });

    it('Given: input without optional fields When: converting Then: should use defaults', () => {
      // Arrange
      const input: IReportCreateInput = {
        type: REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters: {},
        generatedBy: 'user-456',
      };

      // Act
      const props = ReportMapper.toDomainProps(input);

      // Assert
      expect(props.templateId).toBeUndefined();
      expect(props.status.isPending()).toBe(true);
    });
  });

  describe('toResponseData', () => {
    it('Given: Report entity When: converting to response Then: should extract values', () => {
      // Arrange
      const props = {
        type: ReportType.create(REPORT_TYPES.SALES),
        status: ReportStatus.pending(),
        parameters: ReportParameters.create({ warehouseId: 'warehouse-123' }),
        generatedBy: 'user-123',
      };
      const report = Report.create(props, 'org-123');

      // Act
      const data = ReportMapper.toResponseData(report);

      // Assert
      expect(data.id).toBe(report.id);
      expect(data.type).toBe(REPORT_TYPES.SALES);
      expect(data.status).toBe(REPORT_STATUSES.PENDING);
      expect(data.generatedBy).toBe('user-123');
      expect(data.orgId).toBe('org-123');
      expect(data.parameters.warehouseId).toBe('warehouse-123');
    });

    it('Given: completed report with format When: converting Then: should include format', () => {
      // Arrange
      const props = {
        type: ReportType.create(REPORT_TYPES.FINANCIAL),
        status: ReportStatus.pending(),
        parameters: ReportParameters.create({}),
        generatedBy: 'user-123',
      };
      const report = Report.create(props, 'org-123');
      report.markAsGenerating();
      report.complete();

      // Act
      const data = ReportMapper.toResponseData(report);

      // Assert
      expect(data.status).toBe(REPORT_STATUSES.COMPLETED);
      expect(data.generatedAt).toBeDefined();
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of reports When: converting Then: should return array of data', () => {
      // Arrange
      const props = {
        type: ReportType.create(REPORT_TYPES.SALES),
        status: ReportStatus.pending(),
        parameters: ReportParameters.create({}),
        generatedBy: 'user-123',
      };
      const reports = [Report.create(props, 'org-123'), Report.create(props, 'org-123')];

      // Act
      const dataList = ReportMapper.toResponseDataList(reports);

      // Assert
      expect(dataList).toHaveLength(2);
      expect(dataList[0].type).toBe(REPORT_TYPES.SALES);
      expect(dataList[1].type).toBe(REPORT_TYPES.SALES);
    });

    it('Given: empty array When: converting Then: should return empty array', () => {
      // Arrange
      const reports: Report[] = [];

      // Act
      const dataList = ReportMapper.toResponseDataList(reports);

      // Assert
      expect(dataList).toHaveLength(0);
    });
  });

  describe('createEntity', () => {
    it('Given: valid input When: creating entity Then: should create Report entity', () => {
      // Arrange
      const input: IReportCreateInput = {
        type: REPORT_TYPES.TURNOVER,
        parameters: { productId: 'product-123' },
        generatedBy: 'user-123',
      };

      // Act
      const entity = ReportMapper.createEntity(input, 'org-123');

      // Assert
      expect(entity).toBeInstanceOf(Report);
      expect(entity.type.getValue()).toBe(REPORT_TYPES.TURNOVER);
      expect(entity.orgId).toBe('org-123');
      expect(entity.parameters.getProductId()).toBe('product-123');
    });
  });
});
