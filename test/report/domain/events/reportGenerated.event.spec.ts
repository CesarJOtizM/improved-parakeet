import { describe, expect, it } from '@jest/globals';
import { ReportGeneratedEvent } from '@report/domain/events/reportGenerated.event';
import { ReportTypeValue } from '@report/domain/valueObjects';

describe('ReportGeneratedEvent', () => {
  const mockOrgId = 'org-123';
  const mockReportId = 'report-123';
  const mockGeneratedBy = 'user-123';

  describe('constructor', () => {
    it('Given: report generation data When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const type: ReportTypeValue = 'AVAILABLE_INVENTORY';

      // Act
      const event = new ReportGeneratedEvent(mockReportId, type, mockOrgId, mockGeneratedBy);

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('ReportGenerated');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('eventName', () => {
    it('Given: a ReportGeneratedEvent When: getting eventName Then: should return ReportGenerated', () => {
      // Arrange
      const event = new ReportGeneratedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        mockOrgId,
        mockGeneratedBy
      );

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('ReportGenerated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a ReportGeneratedEvent When: getting occurredOn Then: should return a Date', () => {
      // Arrange
      const now = Date.now();
      const event = new ReportGeneratedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        mockOrgId,
        mockGeneratedBy
      );

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      // Allow 1s tolerance for CI environments under load
      expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('reportId', () => {
    it('Given: a ReportGeneratedEvent When: getting reportId Then: should return report id', () => {
      // Arrange
      const event = new ReportGeneratedEvent(
        'specific-report-id',
        'AVAILABLE_INVENTORY',
        mockOrgId,
        mockGeneratedBy
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
      'Given: a ReportGeneratedEvent with type %s When: getting type Then: should return correct type',
      type => {
        // Arrange
        const event = new ReportGeneratedEvent(mockReportId, type, mockOrgId, mockGeneratedBy);

        // Act
        const eventType = event.type;

        // Assert
        expect(eventType).toBe(type);
      }
    );
  });

  describe('orgId', () => {
    it('Given: a ReportGeneratedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const event = new ReportGeneratedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        'specific-org-id',
        mockGeneratedBy
      );

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe('specific-org-id');
    });
  });

  describe('generatedBy', () => {
    it('Given: a ReportGeneratedEvent When: getting generatedBy Then: should return user id', () => {
      // Arrange
      const event = new ReportGeneratedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        mockOrgId,
        'specific-user-id'
      );

      // Act
      const generatedBy = event.generatedBy;

      // Assert
      expect(generatedBy).toBe('specific-user-id');
    });
  });

  describe('generatedAt', () => {
    it('Given: a ReportGeneratedEvent When: getting generatedAt Then: should return same as occurredOn', () => {
      // Arrange
      const event = new ReportGeneratedEvent(
        mockReportId,
        'AVAILABLE_INVENTORY',
        mockOrgId,
        mockGeneratedBy
      );

      // Act
      const generatedAt = event.generatedAt;
      const occurredOn = event.occurredOn;

      // Assert
      expect(generatedAt).toEqual(occurredOn);
    });
  });
});
