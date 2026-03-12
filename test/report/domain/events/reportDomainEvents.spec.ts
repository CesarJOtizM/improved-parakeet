import { describe, expect, it } from '@jest/globals';
import { ReportViewedEvent } from '@report/domain/events/reportViewed.event';
import { ReportGeneratedEvent } from '@report/domain/events/reportGenerated.event';
import { ExportCompletedEvent } from '@report/domain/events/exportCompleted.event';
import { ReportTemplateCreatedEvent } from '@report/domain/events/reportTemplateCreated.event';
import { ReportTemplateUpdatedEvent } from '@report/domain/events/reportTemplateUpdated.event';
import { ReportFormatValue, ReportTypeValue } from '@report/domain/valueObjects';

describe('Report Domain Events', () => {
  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';
  const mockReportId = 'report-789';
  const mockTemplateId = 'template-321';
  const mockTemplateName = 'Monthly Sales Report';
  const mockType: ReportTypeValue = 'AVAILABLE_INVENTORY';

  // ─────────────────────────────────────────────
  // ReportViewedEvent
  // ─────────────────────────────────────────────
  describe('ReportViewedEvent', () => {
    describe('constructor', () => {
      it('Given: report view data When: creating event Then: should create event with correct properties', () => {
        // Arrange & Act
        const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Assert
        expect(event).toBeDefined();
        expect(event.eventName).toBe('ReportViewed');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('eventName', () => {
      it('Given: a ReportViewedEvent When: getting eventName Then: should return ReportViewed', () => {
        // Arrange
        const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const name = event.eventName;

        // Assert
        expect(name).toBe('ReportViewed');
      });
    });

    describe('occurredOn', () => {
      it('Given: a ReportViewedEvent When: getting occurredOn Then: should return a Date within creation window', () => {
        // Arrange
        const now = Date.now();
        const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const occurredOn = event.occurredOn;

        // Assert
        expect(occurredOn).toBeInstanceOf(Date);
        // Allow 1s tolerance for CI environments under load
        expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
      });
    });

    describe('reportId', () => {
      it('Given: a ReportViewedEvent When: getting reportId Then: should return the report id', () => {
        // Arrange
        const event = new ReportViewedEvent('specific-report-id', mockType, mockOrgId, mockUserId);

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
        'Given: a ReportViewedEvent with type %s When: getting type Then: should return correct type',
        type => {
          // Arrange
          const event = new ReportViewedEvent(mockReportId, type, mockOrgId, mockUserId);

          // Act
          const eventType = event.type;

          // Assert
          expect(eventType).toBe(type);
        }
      );
    });

    describe('orgId', () => {
      it('Given: a ReportViewedEvent When: getting orgId Then: should return organization id', () => {
        // Arrange
        const event = new ReportViewedEvent(mockReportId, mockType, 'specific-org-id', mockUserId);

        // Act
        const orgId = event.orgId;

        // Assert
        expect(orgId).toBe('specific-org-id');
      });
    });

    describe('viewedBy', () => {
      it('Given: a ReportViewedEvent When: getting viewedBy Then: should return user id', () => {
        // Arrange
        const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, 'specific-user-id');

        // Act
        const viewedBy = event.viewedBy;

        // Assert
        expect(viewedBy).toBe('specific-user-id');
      });
    });

    describe('viewedAt', () => {
      it('Given: a ReportViewedEvent When: getting viewedAt Then: should return same as occurredOn', () => {
        // Arrange
        const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const viewedAt = event.viewedAt;
        const occurredOn = event.occurredOn;

        // Assert
        expect(viewedAt).toEqual(occurredOn);
      });
    });
  });

  // ─────────────────────────────────────────────
  // ReportGeneratedEvent
  // ─────────────────────────────────────────────
  describe('ReportGeneratedEvent', () => {
    describe('constructor', () => {
      it('Given: report generation data When: creating event Then: should create event with correct properties', () => {
        // Arrange & Act
        const event = new ReportGeneratedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Assert
        expect(event).toBeDefined();
        expect(event.eventName).toBe('ReportGenerated');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('eventName', () => {
      it('Given: a ReportGeneratedEvent When: getting eventName Then: should return ReportGenerated', () => {
        // Arrange
        const event = new ReportGeneratedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const name = event.eventName;

        // Assert
        expect(name).toBe('ReportGenerated');
      });
    });

    describe('occurredOn', () => {
      it('Given: a ReportGeneratedEvent When: getting occurredOn Then: should return a Date within creation window', () => {
        // Arrange
        const now = Date.now();
        const event = new ReportGeneratedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const occurredOn = event.occurredOn;

        // Assert
        expect(occurredOn).toBeInstanceOf(Date);
        // Allow 1s tolerance for CI environments under load
        expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
      });
    });

    describe('reportId', () => {
      it('Given: a ReportGeneratedEvent When: getting reportId Then: should return the report id', () => {
        // Arrange
        const event = new ReportGeneratedEvent(
          'specific-report-id',
          mockType,
          mockOrgId,
          mockUserId
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
          const event = new ReportGeneratedEvent(mockReportId, type, mockOrgId, mockUserId);

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
          mockType,
          'specific-org-id',
          mockUserId
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
          mockType,
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
        const event = new ReportGeneratedEvent(mockReportId, mockType, mockOrgId, mockUserId);

        // Act
        const generatedAt = event.generatedAt;
        const occurredOn = event.occurredOn;

        // Assert
        expect(generatedAt).toEqual(occurredOn);
      });
    });
  });

  // ─────────────────────────────────────────────
  // ExportCompletedEvent
  // ─────────────────────────────────────────────
  describe('ExportCompletedEvent', () => {
    const mockFormat = 'xlsx' as ReportFormatValue;

    describe('constructor', () => {
      it('Given: export completion data When: creating event Then: should create event with correct properties', () => {
        // Arrange & Act
        const event = new ExportCompletedEvent(
          mockReportId,
          mockType,
          mockFormat,
          mockOrgId,
          mockUserId
        );

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
          mockType,
          mockFormat,
          mockOrgId,
          mockUserId
        );

        // Act
        const name = event.eventName;

        // Assert
        expect(name).toBe('ExportCompleted');
      });
    });

    describe('occurredOn', () => {
      it('Given: an ExportCompletedEvent When: getting occurredOn Then: should return a Date within creation window', () => {
        // Arrange
        const now = Date.now();
        const event = new ExportCompletedEvent(
          mockReportId,
          mockType,
          mockFormat,
          mockOrgId,
          mockUserId
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
      it('Given: an ExportCompletedEvent When: getting reportId Then: should return report id', () => {
        // Arrange
        const event = new ExportCompletedEvent(
          'specific-report-id',
          mockType,
          mockFormat,
          mockOrgId,
          mockUserId
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
            mockFormat,
            mockOrgId,
            mockUserId
          );

          // Act
          const eventType = event.type;

          // Assert
          expect(eventType).toBe(type);
        }
      );
    });

    describe('format', () => {
      it.each([['xlsx'], ['csv'], ['pdf']] as unknown as ReportFormatValue[][])(
        'Given: an ExportCompletedEvent with format %s When: getting format Then: should return correct format',
        format => {
          // Arrange
          const event = new ExportCompletedEvent(
            mockReportId,
            mockType,
            format,
            mockOrgId,
            mockUserId
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
          mockType,
          mockFormat,
          'specific-org-id',
          mockUserId
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
          mockType,
          mockFormat,
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
          mockType,
          mockFormat,
          mockOrgId,
          mockUserId
        );

        // Act
        const exportedAt = event.exportedAt;
        const occurredOn = event.occurredOn;

        // Assert
        expect(exportedAt).toEqual(occurredOn);
      });
    });
  });

  // ─────────────────────────────────────────────
  // ReportTemplateCreatedEvent
  // ─────────────────────────────────────────────
  describe('ReportTemplateCreatedEvent', () => {
    describe('constructor', () => {
      it('Given: template creation data When: creating event Then: should create event with correct properties', () => {
        // Arrange & Act
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Assert
        expect(event).toBeDefined();
        expect(event.eventName).toBe('ReportTemplateCreated');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('eventName', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting eventName Then: should return ReportTemplateCreated', () => {
        // Arrange
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const name = event.eventName;

        // Assert
        expect(name).toBe('ReportTemplateCreated');
      });
    });

    describe('occurredOn', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting occurredOn Then: should return a Date within creation window', () => {
        // Arrange
        const now = Date.now();
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const occurredOn = event.occurredOn;

        // Assert
        expect(occurredOn).toBeInstanceOf(Date);
        // Allow 1s tolerance for CI environments under load
        expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
      });
    });

    describe('templateId', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting templateId Then: should return the template id', () => {
        // Arrange
        const event = new ReportTemplateCreatedEvent(
          'specific-template-id',
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const templateId = event.templateId;

        // Assert
        expect(templateId).toBe('specific-template-id');
      });
    });

    describe('name', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting name Then: should return the template name', () => {
        // Arrange
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          'Custom Template Name',
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const name = event.name;

        // Assert
        expect(name).toBe('Custom Template Name');
      });
    });

    describe('type', () => {
      it.each([
        ['AVAILABLE_INVENTORY'],
        ['MOVEMENT_HISTORY'],
        ['LOW_STOCK'],
        ['VALUATION'],
      ] as ReportTypeValue[][])(
        'Given: a ReportTemplateCreatedEvent with type %s When: getting type Then: should return correct type',
        type => {
          // Arrange
          const event = new ReportTemplateCreatedEvent(
            mockTemplateId,
            mockTemplateName,
            type,
            mockOrgId,
            mockUserId
          );

          // Act
          const eventType = event.type;

          // Assert
          expect(eventType).toBe(type);
        }
      );
    });

    describe('orgId', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting orgId Then: should return organization id', () => {
        // Arrange
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          'specific-org-id',
          mockUserId
        );

        // Act
        const orgId = event.orgId;

        // Assert
        expect(orgId).toBe('specific-org-id');
      });
    });

    describe('createdBy', () => {
      it('Given: a ReportTemplateCreatedEvent When: getting createdBy Then: should return user id', () => {
        // Arrange
        const event = new ReportTemplateCreatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          'specific-user-id'
        );

        // Act
        const createdBy = event.createdBy;

        // Assert
        expect(createdBy).toBe('specific-user-id');
      });
    });
  });

  // ─────────────────────────────────────────────
  // ReportTemplateUpdatedEvent
  // ─────────────────────────────────────────────
  describe('ReportTemplateUpdatedEvent', () => {
    describe('constructor', () => {
      it('Given: template update data When: creating event Then: should create event with correct properties', () => {
        // Arrange & Act
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Assert
        expect(event).toBeDefined();
        expect(event.eventName).toBe('ReportTemplateUpdated');
        expect(event.occurredOn).toBeInstanceOf(Date);
      });
    });

    describe('eventName', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting eventName Then: should return ReportTemplateUpdated', () => {
        // Arrange
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const name = event.eventName;

        // Assert
        expect(name).toBe('ReportTemplateUpdated');
      });
    });

    describe('occurredOn', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting occurredOn Then: should return a Date within creation window', () => {
        // Arrange
        const now = Date.now();
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const occurredOn = event.occurredOn;

        // Assert
        expect(occurredOn).toBeInstanceOf(Date);
        // Allow 1s tolerance for CI environments under load
        expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
      });
    });

    describe('templateId', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting templateId Then: should return the template id', () => {
        // Arrange
        const event = new ReportTemplateUpdatedEvent(
          'specific-template-id',
          mockTemplateName,
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const templateId = event.templateId;

        // Assert
        expect(templateId).toBe('specific-template-id');
      });
    });

    describe('name', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting name Then: should return the template name', () => {
        // Arrange
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          'Updated Template Name',
          mockType,
          mockOrgId,
          mockUserId
        );

        // Act
        const name = event.name;

        // Assert
        expect(name).toBe('Updated Template Name');
      });
    });

    describe('type', () => {
      it.each([
        ['AVAILABLE_INVENTORY'],
        ['MOVEMENT_HISTORY'],
        ['LOW_STOCK'],
        ['VALUATION'],
      ] as ReportTypeValue[][])(
        'Given: a ReportTemplateUpdatedEvent with type %s When: getting type Then: should return correct type',
        type => {
          // Arrange
          const event = new ReportTemplateUpdatedEvent(
            mockTemplateId,
            mockTemplateName,
            type,
            mockOrgId,
            mockUserId
          );

          // Act
          const eventType = event.type;

          // Assert
          expect(eventType).toBe(type);
        }
      );
    });

    describe('orgId', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting orgId Then: should return organization id', () => {
        // Arrange
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          'specific-org-id',
          mockUserId
        );

        // Act
        const orgId = event.orgId;

        // Assert
        expect(orgId).toBe('specific-org-id');
      });
    });

    describe('updatedBy', () => {
      it('Given: a ReportTemplateUpdatedEvent When: getting updatedBy Then: should return user id', () => {
        // Arrange
        const event = new ReportTemplateUpdatedEvent(
          mockTemplateId,
          mockTemplateName,
          mockType,
          mockOrgId,
          'specific-user-id'
        );

        // Act
        const updatedBy = event.updatedBy;

        // Assert
        expect(updatedBy).toBe('specific-user-id');
      });
    });
  });

  // ─────────────────────────────────────────────
  // DomainEvent base class behavior
  // ─────────────────────────────────────────────
  describe('DomainEvent base class behavior', () => {
    it('Given: any report domain event When: checking isMarkedForDispatch Then: should default to false', () => {
      // Arrange
      const event = new ReportViewedEvent(mockReportId, mockType, mockOrgId, mockUserId);

      // Act
      const isMarked = event.isMarkedForDispatch;

      // Assert
      expect(isMarked).toBe(false);
    });

    it('Given: any report domain event When: calling markForDispatch Then: isMarkedForDispatch should become true', () => {
      // Arrange
      const event = new ReportGeneratedEvent(mockReportId, mockType, mockOrgId, mockUserId);

      // Act
      event.markForDispatch();

      // Assert
      expect(event.isMarkedForDispatch).toBe(true);
    });

    it('Given: two events created sequentially When: comparing occurredOn Then: second should be >= first', () => {
      // Arrange & Act
      const first = new ExportCompletedEvent(
        mockReportId,
        mockType,
        'xlsx' as any,
        mockOrgId,
        mockUserId
      );
      const second = new ReportTemplateCreatedEvent(
        mockTemplateId,
        mockTemplateName,
        mockType,
        mockOrgId,
        mockUserId
      );

      // Assert
      expect(second.occurredOn.getTime()).toBeGreaterThanOrEqual(first.occurredOn.getTime());
    });
  });
});
