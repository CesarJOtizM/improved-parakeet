// Report Entity Tests
// Unit tests for Report aggregate root following AAA and Given-When-Then pattern

import { Report } from '@report/domain/entities/report.entity';
import {
  ReportFormat,
  ReportParameters,
  ReportStatus,
  ReportType,
  REPORT_STATUSES,
  REPORT_TYPES,
} from '@report/domain/valueObjects';

describe('Report Entity', () => {
  const createValidProps = () => ({
    type: ReportType.create(REPORT_TYPES.SALES),
    status: ReportStatus.pending(),
    parameters: ReportParameters.create({ warehouseId: 'warehouse-123' }),
    generatedBy: 'user-123',
  });

  describe('create', () => {
    it('Given: valid props When: creating Report Then: should create instance', () => {
      // Arrange
      const props = createValidProps();
      const orgId = 'org-123';

      // Act
      const report = Report.create(props, orgId);

      // Assert
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.orgId).toBe(orgId);
      expect(report.type.getValue()).toBe(REPORT_TYPES.SALES);
      expect(report.status.getValue()).toBe(REPORT_STATUSES.PENDING);
      expect(report.generatedBy).toBe('user-123');
    });

    it('Given: props with templateId When: creating Report Then: should set templateId', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        templateId: 'template-123',
      };

      // Act
      const report = Report.create(props, 'org-123');

      // Assert
      expect(report.templateId).toBe('template-123');
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Report Then: should restore entity', () => {
      // Arrange
      const props = createValidProps();
      const id = 'report-123';
      const orgId = 'org-123';

      // Act
      const report = Report.reconstitute(props, id, orgId);

      // Assert
      expect(report.id).toBe(id);
      expect(report.orgId).toBe(orgId);
    });
  });

  describe('markAsGenerating', () => {
    it('Given: PENDING report When: marking as generating Then: should transition to GENERATING', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');

      // Act
      report.markAsGenerating();

      // Assert
      expect(report.status.getValue()).toBe(REPORT_STATUSES.GENERATING);
    });

    it('Given: COMPLETED report When: marking as generating Then: should throw error', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        status: ReportStatus.completed(),
      };
      const report = Report.reconstitute(props, 'report-123', 'org-123');

      // Act & Assert
      expect(() => report.markAsGenerating()).toThrow(
        'Cannot transition from COMPLETED to GENERATING'
      );
    });
  });

  describe('complete', () => {
    it('Given: GENERATING report When: completing Then: should transition to COMPLETED', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      report.markAsGenerating();

      // Act
      report.complete();

      // Assert
      expect(report.status.getValue()).toBe(REPORT_STATUSES.COMPLETED);
      expect(report.generatedAt).toBeDefined();
    });

    it('Given: completing report When: complete Then: should emit ReportGenerated event', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      report.markAsGenerating();

      // Act
      report.complete();

      // Assert
      expect(report.domainEvents.length).toBeGreaterThan(0);
      const event = report.domainEvents.find(e => e.eventName === 'ReportGenerated');
      expect(event).toBeDefined();
    });

    it('Given: PENDING report When: completing Then: should throw error', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');

      // Act & Assert
      expect(() => report.complete()).toThrow('Cannot transition from PENDING to COMPLETED');
    });
  });

  describe('fail', () => {
    it('Given: GENERATING report When: failing Then: should transition to FAILED', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      report.markAsGenerating();
      const errorMessage = 'Generation failed due to timeout';

      // Act
      report.fail(errorMessage);

      // Assert
      expect(report.status.getValue()).toBe(REPORT_STATUSES.FAILED);
      expect(report.errorMessage).toBe(errorMessage);
    });

    it('Given: PENDING report When: failing Then: should transition to FAILED', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      const errorMessage = 'Invalid parameters';

      // Act
      report.fail(errorMessage);

      // Assert
      expect(report.status.getValue()).toBe(REPORT_STATUSES.FAILED);
    });
  });

  describe('markAsViewed', () => {
    it('Given: report When: marking as viewed Then: should emit ReportViewed event', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      const viewedBy = 'user-456';

      // Act
      report.markAsViewed(viewedBy);

      // Assert
      const event = report.domainEvents.find(e => e.eventName === 'ReportViewed');
      expect(event).toBeDefined();
    });
  });

  describe('markAsExported', () => {
    it('Given: COMPLETED report When: marking as exported Then: should transition to EXPORTED', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      report.markAsGenerating();
      report.complete();
      const format = ReportFormat.create('PDF');

      // Act
      report.markAsExported(format, 'user-789');

      // Assert
      expect(report.status.getValue()).toBe(REPORT_STATUSES.EXPORTED);
      expect(report.format?.getValue()).toBe('PDF');
      expect(report.exportedAt).toBeDefined();
    });

    it('Given: exporting report When: markAsExported Then: should emit ExportCompleted event', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      report.markAsGenerating();
      report.complete();
      const format = ReportFormat.create('PDF');

      // Act
      report.markAsExported(format, 'user-789');

      // Assert
      const event = report.domainEvents.find(e => e.eventName === 'ExportCompleted');
      expect(event).toBeDefined();
    });

    it('Given: PENDING report When: marking as exported Then: should throw error', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');
      const format = ReportFormat.create('PDF');

      // Act & Assert
      expect(() => report.markAsExported(format, 'user-789')).toThrow(
        'Can only export completed reports'
      );
    });
  });

  describe('canBeExported', () => {
    it('Given: COMPLETED report When: checking canBeExported Then: should return true', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        status: ReportStatus.completed(),
      };
      const report = Report.reconstitute(props, 'report-123', 'org-123');

      // Act
      const result = report.canBeExported();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: PENDING report When: checking canBeExported Then: should return false', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');

      // Act
      const result = report.canBeExported();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toPlainObject', () => {
    it('Given: report When: converting to plain object Then: should return correct structure', () => {
      // Arrange
      const report = Report.create(createValidProps(), 'org-123');

      // Act
      const plain = report.toPlainObject();

      // Assert
      expect(plain.id).toBe(report.id);
      expect(plain.type).toBe(REPORT_TYPES.SALES);
      expect(plain.status).toBe(REPORT_STATUSES.PENDING);
      expect(plain.generatedBy).toBe('user-123');
      expect(plain.orgId).toBe('org-123');
      expect(plain.parameters).toBeDefined();
    });
  });
});
