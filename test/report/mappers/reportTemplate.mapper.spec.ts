// ReportTemplateMapper Tests
// Unit tests for ReportTemplateMapper following AAA and Given-When-Then pattern

import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { ReportParameters, ReportType, REPORT_TYPES } from '@report/domain/valueObjects';
import { IReportTemplateCreateInput, ReportTemplateMapper } from '@report/mappers';

describe('ReportTemplateMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid input When: converting to domain props Then: should create Value Objects', () => {
      // Arrange
      const input: IReportTemplateCreateInput = {
        name: 'Monthly Sales Report',
        description: 'Monthly sales analysis',
        type: REPORT_TYPES.SALES,
        defaultParameters: { warehouseId: 'warehouse-123' },
        createdBy: 'user-123',
      };

      // Act
      const props = ReportTemplateMapper.toDomainProps(input);

      // Assert
      expect(props.name).toBe('Monthly Sales Report');
      expect(props.description).toBe('Monthly sales analysis');
      expect(props.type).toBeInstanceOf(ReportType);
      expect(props.type.getValue()).toBe(REPORT_TYPES.SALES);
      expect(props.defaultParameters).toBeInstanceOf(ReportParameters);
      expect(props.isActive).toBe(true);
      expect(props.createdBy).toBe('user-123');
    });

    it('Given: input with whitespace in name When: converting Then: should trim name', () => {
      // Arrange
      const input: IReportTemplateCreateInput = {
        name: '  Sales Report  ',
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        createdBy: 'user-123',
      };

      // Act
      const props = ReportTemplateMapper.toDomainProps(input);

      // Assert
      expect(props.name).toBe('Sales Report');
    });

    it('Given: input without description When: converting Then: should allow undefined', () => {
      // Arrange
      const input: IReportTemplateCreateInput = {
        name: 'Simple Report',
        type: REPORT_TYPES.RETURNS,
        defaultParameters: {},
        createdBy: 'user-123',
      };

      // Act
      const props = ReportTemplateMapper.toDomainProps(input);

      // Assert
      expect(props.description).toBeUndefined();
    });
  });

  describe('toResponseData', () => {
    it('Given: ReportTemplate entity When: converting to response Then: should extract values', () => {
      // Arrange
      const props = {
        name: 'Inventory Report',
        description: 'Daily inventory check',
        type: ReportType.create(REPORT_TYPES.AVAILABLE_INVENTORY),
        defaultParameters: ReportParameters.create({ includeInactive: true }),
        isActive: true,
        createdBy: 'user-123',
      };
      const template = ReportTemplate.create(props, 'org-123');

      // Act
      const data = ReportTemplateMapper.toResponseData(template);

      // Assert
      expect(data.id).toBe(template.id);
      expect(data.name).toBe('Inventory Report');
      expect(data.description).toBe('Daily inventory check');
      expect(data.type).toBe(REPORT_TYPES.AVAILABLE_INVENTORY);
      expect(data.isActive).toBe(true);
      expect(data.createdBy).toBe('user-123');
      expect(data.orgId).toBe('org-123');
      expect(data.defaultParameters.includeInactive).toBe(true);
    });

    it('Given: inactive template When: converting Then: should show isActive as false', () => {
      // Arrange
      const props = {
        name: 'Disabled Report',
        type: ReportType.create(REPORT_TYPES.FINANCIAL),
        defaultParameters: ReportParameters.create({}),
        isActive: false,
        createdBy: 'user-123',
      };
      const template = ReportTemplate.reconstitute(props, 'template-123', 'org-123');

      // Act
      const data = ReportTemplateMapper.toResponseData(template);

      // Assert
      expect(data.isActive).toBe(false);
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of templates When: converting Then: should return array of data', () => {
      // Arrange
      const createTemplate = (name: string) => {
        const props = {
          name,
          type: ReportType.create(REPORT_TYPES.SALES),
          defaultParameters: ReportParameters.create({}),
          isActive: true,
          createdBy: 'user-123',
        };
        return ReportTemplate.create(props, 'org-123');
      };

      const templates = [
        createTemplate('Report 1'),
        createTemplate('Report 2'),
        createTemplate('Report 3'),
      ];

      // Act
      const dataList = ReportTemplateMapper.toResponseDataList(templates);

      // Assert
      expect(dataList).toHaveLength(3);
      expect(dataList[0].name).toBe('Report 1');
      expect(dataList[1].name).toBe('Report 2');
      expect(dataList[2].name).toBe('Report 3');
    });

    it('Given: empty array When: converting Then: should return empty array', () => {
      // Arrange
      const templates: ReportTemplate[] = [];

      // Act
      const dataList = ReportTemplateMapper.toResponseDataList(templates);

      // Assert
      expect(dataList).toHaveLength(0);
    });
  });

  describe('createEntity', () => {
    it('Given: valid input When: creating entity Then: should create ReportTemplate entity', () => {
      // Arrange
      const input: IReportTemplateCreateInput = {
        name: 'Custom Report',
        description: 'A custom report template',
        type: REPORT_TYPES.TURNOVER,
        defaultParameters: { productId: 'product-456' },
        createdBy: 'user-789',
      };

      // Act
      const entity = ReportTemplateMapper.createEntity(input, 'org-123');

      // Assert
      expect(entity).toBeInstanceOf(ReportTemplate);
      expect(entity.name).toBe('Custom Report');
      expect(entity.type.getValue()).toBe(REPORT_TYPES.TURNOVER);
      expect(entity.orgId).toBe('org-123');
      expect(entity.createdBy).toBe('user-789');
    });
  });
});
