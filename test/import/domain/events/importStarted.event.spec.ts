import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportStartedEvent } from '@import/domain/events/importStarted.event';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ImportStartedEvent', () => {
  const mockOrgId = 'org-123';

  const createMockBatch = (
    overrides: Partial<{
      id: string;
      type: string;
      fileName: string;
      totalRows: number;
      createdBy: string;
    }> = {}
  ): ImportBatch => {
    return ImportBatch.reconstitute(
      {
        type: ImportType.create(overrides.type || 'PRODUCTS'),
        status: ImportStatus.create('VALIDATING'),
        fileName: overrides.fileName || 'test-file.csv',
        totalRows: overrides.totalRows || 100,
        processedRows: 0,
        validRows: 0,
        invalidRows: 0,
        startedAt: new Date(),
        createdBy: overrides.createdBy || 'user-123',
      },
      overrides.id || 'batch-123',
      mockOrgId
    );
  };

  describe('constructor', () => {
    it('Given: an import batch When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const batch = createMockBatch();

      // Act
      const event = new ImportStartedEvent(batch);

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('ImportStarted');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('eventName', () => {
    it('Given: an ImportStartedEvent When: getting eventName Then: should return ImportStarted', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportStartedEvent(batch);

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('ImportStarted');
    });
  });

  describe('occurredOn', () => {
    it('Given: an ImportStartedEvent When: getting occurredOn Then: should return a Date', () => {
      // Arrange
      const batch = createMockBatch();
      const beforeEvent = new Date();
      const event = new ImportStartedEvent(batch);
      const afterEvent = new Date();

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeEvent.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterEvent.getTime());
    });
  });

  describe('batchId', () => {
    it('Given: an ImportStartedEvent When: getting batchId Then: should return batch id', () => {
      // Arrange
      const batch = createMockBatch({ id: 'specific-batch-id' });
      const event = new ImportStartedEvent(batch);

      // Act
      const batchId = event.batchId;

      // Assert
      expect(batchId).toBe('specific-batch-id');
    });
  });

  describe('orgId', () => {
    it('Given: an ImportStartedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportStartedEvent(batch);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('importType', () => {
    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: a batch with type %s When: getting importType Then: should return correct type',
      (type: string) => {
        // Arrange
        const batch = createMockBatch({ type });
        const event = new ImportStartedEvent(batch);

        // Act
        const importType = event.importType;

        // Assert
        expect(importType).toBe(type);
      }
    );
  });

  describe('fileName', () => {
    it('Given: an ImportStartedEvent When: getting fileName Then: should return file name', () => {
      // Arrange
      const batch = createMockBatch({ fileName: 'my-import-file.csv' });
      const event = new ImportStartedEvent(batch);

      // Act
      const fileName = event.fileName;

      // Assert
      expect(fileName).toBe('my-import-file.csv');
    });
  });

  describe('totalRows', () => {
    it('Given: an ImportStartedEvent When: getting totalRows Then: should return total rows', () => {
      // Arrange
      const batch = createMockBatch({ totalRows: 250 });
      const event = new ImportStartedEvent(batch);

      // Act
      const totalRows = event.totalRows;

      // Assert
      expect(totalRows).toBe(250);
    });
  });

  describe('createdBy', () => {
    it('Given: an ImportStartedEvent When: getting createdBy Then: should return creator id', () => {
      // Arrange
      const batch = createMockBatch({ createdBy: 'specific-user-id' });
      const event = new ImportStartedEvent(batch);

      // Act
      const createdBy = event.createdBy;

      // Assert
      expect(createdBy).toBe('specific-user-id');
    });
  });
});
