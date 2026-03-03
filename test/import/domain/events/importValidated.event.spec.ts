import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportValidatedEvent } from '@import/domain/events/importValidated.event';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ImportValidatedEvent', () => {
  const mockOrgId = 'org-123';

  const createMockBatch = (
    overrides: Partial<{
      id: string;
      type: string;
      totalRows: number;
      validRows: number;
      invalidRows: number;
      validatedAt: Date;
    }> = {}
  ): ImportBatch => {
    return ImportBatch.reconstitute(
      {
        type: ImportType.create(overrides.type || 'PRODUCTS'),
        status: ImportStatus.create('VALIDATED'),
        fileName: 'test-file.csv',
        totalRows: overrides.totalRows || 100,
        processedRows: 0,
        validRows: overrides.validRows || 80,
        invalidRows: overrides.invalidRows || 20,
        startedAt: new Date(),
        validatedAt: overrides.validatedAt || new Date(),
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
      const event = new ImportValidatedEvent(batch);

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('ImportValidated');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('eventName', () => {
    it('Given: an ImportValidatedEvent When: getting eventName Then: should return ImportValidated', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportValidatedEvent(batch);

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('ImportValidated');
    });
  });

  describe('occurredOn', () => {
    it('Given: an ImportValidatedEvent When: getting occurredOn Then: should return a Date', () => {
      // Arrange
      const batch = createMockBatch();
      const now = Date.now();
      const event = new ImportValidatedEvent(batch);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      // Allow 1s tolerance for CI environments under load
      expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('batchId', () => {
    it('Given: an ImportValidatedEvent When: getting batchId Then: should return batch id', () => {
      // Arrange
      const batch = createMockBatch({ id: 'specific-batch-id' });
      const event = new ImportValidatedEvent(batch);

      // Act
      const batchId = event.batchId;

      // Assert
      expect(batchId).toBe('specific-batch-id');
    });
  });

  describe('orgId', () => {
    it('Given: an ImportValidatedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const batch = createMockBatch();
      const event = new ImportValidatedEvent(batch);

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
        const event = new ImportValidatedEvent(batch);

        // Act
        const importType = event.importType;

        // Assert
        expect(importType).toBe(type);
      }
    );
  });

  describe('totalRows', () => {
    it('Given: an ImportValidatedEvent When: getting totalRows Then: should return total rows', () => {
      // Arrange
      const batch = createMockBatch({ totalRows: 500 });
      const event = new ImportValidatedEvent(batch);

      // Act
      const totalRows = event.totalRows;

      // Assert
      expect(totalRows).toBe(500);
    });
  });

  describe('validRows', () => {
    it('Given: an ImportValidatedEvent When: getting validRows Then: should return valid rows count', () => {
      // Arrange
      const batch = createMockBatch({ validRows: 450 });
      const event = new ImportValidatedEvent(batch);

      // Act
      const validRows = event.validRows;

      // Assert
      expect(validRows).toBe(450);
    });
  });

  describe('invalidRows', () => {
    it('Given: an ImportValidatedEvent When: getting invalidRows Then: should return invalid rows count', () => {
      // Arrange
      const batch = createMockBatch({ invalidRows: 50 });
      const event = new ImportValidatedEvent(batch);

      // Act
      const invalidRows = event.invalidRows;

      // Assert
      expect(invalidRows).toBe(50);
    });
  });

  describe('validatedAt', () => {
    it('Given: an ImportValidatedEvent with validatedAt When: getting validatedAt Then: should return date', () => {
      // Arrange
      const validatedDate = new Date('2024-06-15T10:30:00Z');
      const batch = createMockBatch({ validatedAt: validatedDate });
      const event = new ImportValidatedEvent(batch);

      // Act
      const validatedAt = event.validatedAt;

      // Assert
      expect(validatedAt).toEqual(validatedDate);
    });
  });
});
