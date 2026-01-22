import { describe, expect, it } from '@jest/globals';
import { ExportCompletedEvent } from '@report/domain/events/exportCompleted.event';
import { ReportFormatValue, ReportTypeValue } from '@report/domain/valueObjects';

describe('ExportCompletedEvent', () => {
  const mockOrgId = 'org-123';
  const mockReportId = 'report-123';
  const mockExportedBy = 'user-123';

  describe('constructor', () => {
    it('Given: export completion data When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const type: ReportTypeValue = 'AVAILABLE_INVENTORY';
      const format: ReportFormatValue = 'xlsx';

      // Act
      const event = new ExportCompletedEvent(mockReportId, type, format, mockOrgId, mockExportedBy);

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('ExportCompleted');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('eventName', () => {
    it('Given: an ExportCompletedEvent When: getting eventName Then: should return ExportCompleted', () => {
      // Arrange
      const event = new ExportCompletedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'xlsx',
        mockOrgId,
        mockExportedBy
      );

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('ExportCompleted');
    });
  });

  describe('occurredOn', () => {
    it('Given: an ExportCompletedEvent When: getting occurredOn Then: should return a Date', () => {
      // Arrange
      const beforeEvent = new Date();
      const event = new ExportCompletedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'xlsx',
        mockOrgId,
        mockExportedBy
      );
      const afterEvent = new Date();

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeEvent.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterEvent.getTime());
    });
  });

  describe('reportId', () => {
    it('Given: an ExportCompletedEvent When: getting reportId Then: should return report id', () => {
      // Arrange
      const event = new ExportCompletedEvent(
        'specific-report-id',
        'AVAILABLE_INVENTORY',
        'xlsx',
        mockOrgId,
        mockExportedBy
      );

      // Act
      const reportId = event.reportId;

      // Assert
      expect(reportId).toBe('specific-report-id');
    });
  });

  describe('type', () => {
    it.each([
      ['AVAILABLE_INVENTORY'],
      ['MOVEMENT_HISTORY'],
      ['LOW_STOCK'],
      ['VALUATION'],
    ] as ReportTypeValue[][])(
      'Given: an ExportCompletedEvent with type %s When: getting type Then: should return correct type',
      type => {
        // Arrange
        const event = new ExportCompletedEvent(
          mockReportId,
          type,
          'xlsx',
          mockOrgId,
          mockExportedBy
        );

        // Act
        const eventType = event.type;

        // Assert
        expect(eventType).toBe(type);
      }
    );
  });

  describe('format', () => {
    it.each([['xlsx'], ['csv'], ['pdf']] as ReportFormatValue[][])(
      'Given: an ExportCompletedEvent with format %s When: getting format Then: should return correct format',
      format => {
        // Arrange
        const event = new ExportCompletedEvent(
          mockReportId,
          'AVAILABLE_INVENTORY',
          format,
          mockOrgId,
          mockExportedBy
        );

        // Act
        const eventFormat = event.format;

        // Assert
        expect(eventFormat).toBe(format);
      }
    );
  });

  describe('orgId', () => {
    it('Given: an ExportCompletedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const event = new ExportCompletedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'xlsx',
        'specific-org-id',
        mockExportedBy
      );

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe('specific-org-id');
    });
  });

  describe('exportedBy', () => {
    it('Given: an ExportCompletedEvent When: getting exportedBy Then: should return user id', () => {
      // Arrange
      const event = new ExportCompletedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'xlsx',
        mockOrgId,
        'specific-user-id'
      );

      // Act
      const exportedBy = event.exportedBy;

      // Assert
      expect(exportedBy).toBe('specific-user-id');
    });
  });

  describe('exportedAt', () => {
    it('Given: an ExportCompletedEvent When: getting exportedAt Then: should return same as occurredOn', () => {
      // Arrange
      const event = new ExportCompletedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'xlsx',
        mockOrgId,
        mockExportedBy
      );

      // Act
      const exportedAt = event.exportedAt;
      const occurredOn = event.occurredOn;

      // Assert
      expect(exportedAt).toEqual(occurredOn);
    });
  });
});
