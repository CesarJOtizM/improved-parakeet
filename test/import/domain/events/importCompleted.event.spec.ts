import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportCompletedEvent } from '@import/domain/events/importCompleted.event';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ImportCompletedEvent', () => {
  const mockOrgId = 'org-123';

  const createMockBatch = (
    overrides: Partial<{
      id: string;
      type: string;
      totalRows: number;
      processedRows: number;
      validRows: number;
      invalidRows: number;
      completedAt: Date;
    }> = {}
  ): ImportBatch => {
    return ImportBatch.reconstitute(
      {
        type: ImportType.create(overrides.type || 'PRODUCTS'),
        status: ImportStatus.create('COMPLETED'),
        fileName: 'test-file.csv',
        totalRows: overrides.totalRows || 100,
        processedRows: overrides.processedRows || 100,
        validRows: overrides.validRows || 80,
        invalidRows: overrides.invalidRows || 20,
        startedAt: new Date(),
        validatedAt: new Date(),
        completedAt: overrides.completedAt || new Date(),
        createdBy: 'user-123',
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
      const event = new ImportCompletedEvent(batch);

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('ImportCompleted');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('eventName', () => {
    it('Given: an ImportCompletedEvent When: getting eventName Then: should return ImportCompleted', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportCompletedEvent(batch);

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('ImportCompleted');
    });
  });

  describe('occurredOn', () => {
    it('Given: an ImportCompletedEvent When: getting occurredOn Then: should return a Date', () => {
      // Arrange
      const batch = createMockBatch();
      const now = Date.now();
      const event = new ImportCompletedEvent(batch);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      // Allow 1s tolerance for CI environments under load
      expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('batchId', () => {
    it('Given: an ImportCompletedEvent When: getting batchId Then: should return batch id', () => {
      // Arrange
      const batch = createMockBatch({ id: 'specific-batch-id' });
      const event = new ImportCompletedEvent(batch);

      // Act
      const batchId = event.batchId;

      // Assert
      expect(batchId).toBe('specific-batch-id');
    });
  });

  describe('orgId', () => {
    it('Given: an ImportCompletedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportCompletedEvent(batch);

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
        const event = new ImportCompletedEvent(batch);

        // Act
        const importType = event.importType;

        // Assert
        expect(importType).toBe(type);
      }
    );
  });

  describe('totalRows', () => {
    it('Given: an ImportCompletedEvent When: getting totalRows Then: should return total rows', () => {
      // Arrange
      const batch = createMockBatch({ totalRows: 500 });
      const event = new ImportCompletedEvent(batch);

      // Act
      const totalRows = event.totalRows;

      // Assert
      expect(totalRows).toBe(500);
    });
  });

  describe('processedRows', () => {
    it('Given: an ImportCompletedEvent When: getting processedRows Then: should return processed rows count', () => {
      // Arrange
      const batch = createMockBatch({ processedRows: 480 });
      const event = new ImportCompletedEvent(batch);

      // Act
      const processedRows = event.processedRows;

      // Assert
      expect(processedRows).toBe(480);
    });
  });

  describe('validRows', () => {
    it('Given: an ImportCompletedEvent When: getting validRows Then: should return valid rows count', () => {
      // Arrange
      const batch = createMockBatch({ validRows: 450 });
      const event = new ImportCompletedEvent(batch);

      // Act
      const validRows = event.validRows;

      // Assert
      expect(validRows).toBe(450);
    });
  });

  describe('invalidRows', () => {
    it('Given: an ImportCompletedEvent When: getting invalidRows Then: should return invalid rows count', () => {
      // Arrange
      const batch = createMockBatch({ invalidRows: 50 });
      const event = new ImportCompletedEvent(batch);

      // Act
      const invalidRows = event.invalidRows;

      // Assert
      expect(invalidRows).toBe(50);
    });
  });

  describe('completedAt', () => {
    it('Given: an ImportCompletedEvent with completedAt When: getting completedAt Then: should return date', () => {
      // Arrange
      const completedDate = new Date('2024-06-15T12:00:00Z');
      const batch = createMockBatch({ completedAt: completedDate });
      const event = new ImportCompletedEvent(batch);

      // Act
      const completedAt = event.completedAt;

      // Assert
      expect(completedAt).toEqual(completedDate);
    });

    it('Given: an ImportCompletedEvent without completedAt When: getting completedAt Then: should return undefined', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('COMPLETED'),
          fileName: 'test-file.csv',
          totalRows: 100,
          processedRows: 100,
          validRows: 80,
          invalidRows: 20,
          startedAt: new Date(),
          validatedAt: new Date(),
          completedAt: undefined,
          createdBy: 'user-123',
        },
        'batch-123',
        mockOrgId
      );
      const event = new ImportCompletedEvent(batch);

      // Act
      const completedAt = event.completedAt;

      // Assert
      expect(completedAt).toBeUndefined();
    });
  });
});
