import { ImportBatch, IImportBatchProps } from '@import/domain/entities/importBatch.entity';
import { ImportRow } from '@import/domain/entities/importRow.entity';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('ImportBatch', () => {
  const mockOrgId = 'org-123';
  const mockBatchId = 'batch-456';
  const mockUserId = 'user-789';

  const createDefaultProps = (overrides: Partial<IImportBatchProps> = {}): IImportBatchProps => ({
    type: ImportType.create('PRODUCTS'),
    status: ImportStatus.create('PENDING'),
    fileName: 'test-import.csv',
    totalRows: 0,
    processedRows: 0,
    validRows: 0,
    invalidRows: 0,
    createdBy: mockUserId,
    ...overrides,
  });

  const createValidRow = (rowNumber: number, orgId: string = mockOrgId): ImportRow => {
    return ImportRow.create(
      {
        rowNumber,
        data: { name: `Product ${rowNumber}`, sku: `SKU-${rowNumber}` },
        validationResult: ValidationResult.valid(),
      },
      orgId
    );
  };

  const createInvalidRow = (rowNumber: number, orgId: string = mockOrgId): ImportRow => {
    return ImportRow.create(
      {
        rowNumber,
        data: { name: '', sku: '' },
        validationResult: ValidationResult.invalid(['Name is required']),
      },
      orgId
    );
  };

  describe('create', () => {
    it('Given: valid props with PENDING status When: creating ImportBatch Then: should create batch with correct properties', () => {
      // Arrange
      const props = createDefaultProps();

      // Act
      const batch = ImportBatch.create(props, mockOrgId);

      // Assert
      expect(batch).toBeDefined();
      expect(batch.id).toBeDefined();
      expect(batch.orgId).toBe(mockOrgId);
      expect(batch.status.isPending()).toBe(true);
      expect(batch.type.isProducts()).toBe(true);
      expect(batch.fileName).toBe('test-import.csv');
      expect(batch.totalRows).toBe(0);
      expect(batch.processedRows).toBe(0);
      expect(batch.validRows).toBe(0);
      expect(batch.invalidRows).toBe(0);
      expect(batch.createdBy).toBe(mockUserId);
      expect(batch.startedAt).toBeUndefined();
      expect(batch.completedAt).toBeUndefined();
      expect(batch.errorMessage).toBeUndefined();
    });

    it('Given: props with optional fields When: creating ImportBatch Then: should preserve optional fields', () => {
      // Arrange
      const props = createDefaultProps({
        note: 'Test import note',
      });

      // Act
      const batch = ImportBatch.create(props, mockOrgId);

      // Assert
      expect(batch.note).toBe('Test import note');
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props, id, and orgId When: reconstituting ImportBatch Then: should preserve id and orgId', () => {
      // Arrange
      const props = createDefaultProps({
        status: ImportStatus.create('VALIDATING'),
        startedAt: new Date('2026-01-15'),
      });

      // Act
      const batch = ImportBatch.reconstitute(props, mockBatchId, mockOrgId);

      // Assert
      expect(batch.id).toBe(mockBatchId);
      expect(batch.orgId).toBe(mockOrgId);
      expect(batch.status.isValidating()).toBe(true);
      expect(batch.startedAt).toEqual(new Date('2026-01-15'));
    });
  });

  describe('start', () => {
    it('Given: batch with PENDING status When: starting Then: should transition to VALIDATING and set startedAt', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);

      // Act
      batch.start();

      // Assert
      expect(batch.status.isValidating()).toBe(true);
      expect(batch.startedAt).toBeInstanceOf(Date);
    });

    it('Given: batch with PENDING status When: starting Then: should emit ImportStartedEvent', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);

      // Act
      batch.start();

      // Assert
      expect(batch.domainEvents).toHaveLength(1);
      expect(batch.domainEvents[0].eventName).toBe('ImportStarted');
    });

    it.each([['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: starting Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.start()).toThrow(
          'Import batch can only be started when status is PENDING'
        );
      }
    );
  });

  describe('addRow', () => {
    it('Given: batch with PENDING status When: adding a row Then: should add the row and update totalRows', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      const row = createValidRow(1);

      // Act
      batch.addRow(row);

      // Assert
      expect(batch.getRows()).toHaveLength(1);
      expect(batch.totalRows).toBe(1);
    });

    it('Given: batch with VALIDATING status When: adding a row Then: should add the row successfully', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.start(); // transitions to VALIDATING
      const row = createValidRow(1);

      // Act
      batch.addRow(row);

      // Assert
      expect(batch.getRows()).toHaveLength(1);
      expect(batch.totalRows).toBe(1);
    });

    it.each([['COMPLETED'], ['FAILED'], ['PROCESSING']])(
      'Given: batch with %s status When: adding a row Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        const row = createValidRow(1);

        // Act & Assert
        expect(() => batch.addRow(row)).toThrow(
          'Rows can only be added when status is PENDING or VALIDATING'
        );
      }
    );

    it('Given: batch with PENDING status When: adding multiple rows Then: should track totalRows correctly', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);

      // Act
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));
      batch.addRow(createInvalidRow(3));

      // Assert
      expect(batch.getRows()).toHaveLength(3);
      expect(batch.totalRows).toBe(3);
    });
  });

  describe('setRows', () => {
    it('Given: batch with PENDING status When: setting rows Then: should replace rows and update totalRows', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      const newRows = [createValidRow(1), createValidRow(2), createInvalidRow(3)];

      // Act
      batch.setRows(newRows);

      // Assert
      expect(batch.getRows()).toHaveLength(3);
      expect(batch.totalRows).toBe(3);
    });

    it('Given: batch with VALIDATING status When: setting rows Then: should replace rows successfully', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.start();
      const newRows = [createValidRow(1), createValidRow(2)];

      // Act
      batch.setRows(newRows);

      // Assert
      expect(batch.getRows()).toHaveLength(2);
      expect(batch.totalRows).toBe(2);
    });

    it.each([['COMPLETED'], ['FAILED'], ['PROCESSING']])(
      'Given: batch with %s status When: setting rows Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.setRows([createValidRow(1)])).toThrow(
          'Rows can only be set when status is PENDING or VALIDATING'
        );
      }
    );
  });

  describe('restoreRows', () => {
    it('Given: batch in any status When: restoring rows Then: should work regardless of status', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({ status: ImportStatus.create('COMPLETED') }),
        mockBatchId,
        mockOrgId
      );
      const rows = [createValidRow(1), createValidRow(2)];

      // Act
      batch.restoreRows(rows);

      // Assert
      expect(batch.getRows()).toHaveLength(2);
    });

    it('Given: batch with existing rows When: restoring rows Then: should replace existing rows', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      const restoredRows = [createValidRow(10), createValidRow(20), createValidRow(30)];

      // Act
      batch.restoreRows(restoredRows);

      // Assert
      expect(batch.getRows()).toHaveLength(3);
      expect(batch.getRows()[0].rowNumber).toBe(10);
    });

    it('Given: batch in FAILED status When: restoring rows Then: should not throw error', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({ status: ImportStatus.create('FAILED') }),
        mockBatchId,
        mockOrgId
      );

      // Act & Assert
      expect(() => batch.restoreRows([createValidRow(1)])).not.toThrow();
    });
  });

  describe('markAsValidated', () => {
    it('Given: batch with VALIDATING status and rows When: marking as validated Then: should transition to VALIDATED and count valid/invalid rows', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));
      batch.addRow(createInvalidRow(3));
      batch.start(); // PENDING -> VALIDATING

      // Act
      batch.markAsValidated();

      // Assert
      expect(batch.status.isValidated()).toBe(true);
      expect(batch.validRows).toBe(2);
      expect(batch.invalidRows).toBe(1);
      expect(batch.validatedAt).toBeInstanceOf(Date);
    });

    it('Given: batch with VALIDATING status When: marking as validated Then: should emit ImportValidatedEvent', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.start();
      batch.clearEvents(); // clear ImportStartedEvent

      // Act
      batch.markAsValidated();

      // Assert
      expect(batch.domainEvents).toHaveLength(1);
      expect(batch.domainEvents[0].eventName).toBe('ImportValidated');
    });

    it.each([['PENDING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: marking as validated Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.markAsValidated()).toThrow(
          'Import batch can only be marked as validated when status is VALIDATING'
        );
      }
    );
  });

  describe('markAsProcessing', () => {
    it('Given: batch with VALIDATED status When: marking as processing Then: should transition to PROCESSING', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({ status: ImportStatus.create('VALIDATED') }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.markAsProcessing();

      // Assert
      expect(batch.status.isProcessing()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: marking as processing Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.markAsProcessing()).toThrow(
          'Import batch can only be processed when status is VALIDATED'
        );
      }
    );
  });

  describe('incrementProcessedRows', () => {
    it('Given: batch with PROCESSING status When: incrementing processed rows Then: should increment the counter', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 10,
          processedRows: 3,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.incrementProcessedRows();

      // Assert
      expect(batch.processedRows).toBe(4);
    });

    it('Given: batch with PROCESSING status When: incrementing multiple times Then: should track correctly', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 5,
          processedRows: 0,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.incrementProcessedRows();
      batch.incrementProcessedRows();
      batch.incrementProcessedRows();

      // Assert
      expect(batch.processedRows).toBe(3);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: incrementing processed rows Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.incrementProcessedRows()).toThrow(
          'Can only increment processed rows when status is PROCESSING'
        );
      }
    );
  });

  describe('updateProgress', () => {
    it('Given: batch with PROCESSING status When: updating progress Then: should set processedRows', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 100,
          processedRows: 0,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.updateProgress(50);

      // Assert
      expect(batch.processedRows).toBe(50);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: updating progress Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.updateProgress(10)).toThrow(
          'Can only update progress when status is PROCESSING'
        );
      }
    );
  });

  describe('complete', () => {
    it('Given: batch with PROCESSING status When: completing Then: should transition to COMPLETED and set completedAt', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 10,
          processedRows: 10,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.complete();

      // Assert
      expect(batch.status.isCompleted()).toBe(true);
      expect(batch.completedAt).toBeInstanceOf(Date);
    });

    it('Given: batch with PROCESSING status When: completing Then: should emit ImportCompletedEvent', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 10,
          processedRows: 10,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.complete();

      // Assert
      expect(batch.domainEvents).toHaveLength(1);
      expect(batch.domainEvents[0].eventName).toBe('ImportCompleted');
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: completing Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.complete()).toThrow(
          'Import batch can only be completed when status is PROCESSING'
        );
      }
    );
  });

  describe('fail', () => {
    it('Given: batch with PENDING status When: failing with reason Then: should transition to FAILED and set errorMessage', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);

      // Act
      batch.fail('File format is invalid');

      // Assert
      expect(batch.status.isFailed()).toBe(true);
      expect(batch.errorMessage).toBe('File format is invalid');
      expect(batch.completedAt).toBeInstanceOf(Date);
    });

    it('Given: batch with VALIDATING status When: failing Then: should transition to FAILED', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.start();

      // Act
      batch.fail('Validation timeout');

      // Assert
      expect(batch.status.isFailed()).toBe(true);
      expect(batch.errorMessage).toBe('Validation timeout');
    });

    it('Given: batch with PROCESSING status When: failing Then: should transition to FAILED', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({ status: ImportStatus.create('PROCESSING') }),
        mockBatchId,
        mockOrgId
      );

      // Act
      batch.fail('Database connection lost');

      // Assert
      expect(batch.status.isFailed()).toBe(true);
      expect(batch.errorMessage).toBe('Database connection lost');
    });

    it.each([['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: batch with %s status When: failing Then: should throw error',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act & Assert
        expect(() => batch.fail('some reason')).toThrow(
          'Import batch cannot be marked as failed in current status'
        );
      }
    );
  });

  describe('getProgress', () => {
    it('Given: batch with totalRows 0 When: getting progress Then: should return 0', () => {
      // Arrange
      const batch = ImportBatch.create(
        createDefaultProps({ totalRows: 0, processedRows: 0 }),
        mockOrgId
      );

      // Act
      const progress = batch.getProgress();

      // Assert
      expect(progress).toBe(0);
    });

    it('Given: batch with 50 of 100 rows processed When: getting progress Then: should return 50', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 100,
          processedRows: 50,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      const progress = batch.getProgress();

      // Assert
      expect(progress).toBe(50);
    });

    it('Given: batch with 1 of 3 rows processed When: getting progress Then: should return rounded percentage', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 3,
          processedRows: 1,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      const progress = batch.getProgress();

      // Assert
      expect(progress).toBe(33); // Math.round(1/3 * 100) = 33
    });

    it('Given: batch with all rows processed When: getting progress Then: should return 100', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({
          status: ImportStatus.create('PROCESSING'),
          totalRows: 75,
          processedRows: 75,
        }),
        mockBatchId,
        mockOrgId
      );

      // Act
      const progress = batch.getProgress();

      // Assert
      expect(progress).toBe(100);
    });
  });

  describe('canBeRetried', () => {
    it('Given: batch with FAILED status When: checking canBeRetried Then: should return true', () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        createDefaultProps({ status: ImportStatus.create('FAILED') }),
        mockBatchId,
        mockOrgId
      );

      // Act
      const result = batch.canBeRetried();

      // Assert
      expect(result).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED']])(
      'Given: batch with %s status When: checking canBeRetried Then: should return false',
      (statusValue: string) => {
        // Arrange
        const batch = ImportBatch.reconstitute(
          createDefaultProps({ status: ImportStatus.create(statusValue) }),
          mockBatchId,
          mockOrgId
        );

        // Act
        const result = batch.canBeRetried();

        // Assert
        expect(result).toBe(false);
      }
    );
  });

  describe('getRows / getValidRows / getInvalidRows', () => {
    let batch: ImportBatch;

    beforeEach(() => {
      batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));
      batch.addRow(createInvalidRow(3));
      batch.addRow(createInvalidRow(4));
      batch.addRow(createValidRow(5));
    });

    it('Given: batch with mixed rows When: getting all rows Then: should return all rows', () => {
      // Act
      const rows = batch.getRows();

      // Assert
      expect(rows).toHaveLength(5);
    });

    it('Given: batch with mixed rows When: getting valid rows Then: should return only valid rows', () => {
      // Act
      const validRows = batch.getValidRows();

      // Assert
      expect(validRows).toHaveLength(3);
      validRows.forEach(row => {
        expect(row.isValid()).toBe(true);
      });
    });

    it('Given: batch with mixed rows When: getting invalid rows Then: should return only invalid rows', () => {
      // Act
      const invalidRows = batch.getInvalidRows();

      // Assert
      expect(invalidRows).toHaveLength(2);
      invalidRows.forEach(row => {
        expect(row.isValid()).toBe(false);
      });
    });

    it('Given: batch with rows When: getting rows Then: should return a copy (not the internal array)', () => {
      // Act
      const rows = batch.getRows();
      rows.pop();

      // Assert
      expect(batch.getRows()).toHaveLength(5);
    });
  });

  describe('getRowByNumber', () => {
    it('Given: batch with rows When: getting row by existing number Then: should return the row', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));
      batch.addRow(createValidRow(3));

      // Act
      const row = batch.getRowByNumber(2);

      // Assert
      expect(row).toBeDefined();
      expect(row!.rowNumber).toBe(2);
    });

    it('Given: batch with rows When: getting row by non-existing number Then: should return undefined', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));

      // Act
      const row = batch.getRowByNumber(999);

      // Assert
      expect(row).toBeUndefined();
    });
  });

  describe('getters', () => {
    it('Given: a fully populated batch When: accessing all getters Then: should return correct values', () => {
      // Arrange
      const startedAt = new Date('2026-02-01T10:00:00Z');
      const validatedAt = new Date('2026-02-01T10:05:00Z');
      const completedAt = new Date('2026-02-01T10:30:00Z');

      const props = createDefaultProps({
        type: ImportType.create('MOVEMENTS'),
        status: ImportStatus.create('COMPLETED'),
        fileName: 'movements-2026.csv',
        totalRows: 500,
        processedRows: 500,
        validRows: 480,
        invalidRows: 20,
        startedAt,
        validatedAt,
        completedAt,
        errorMessage: undefined,
        note: 'Monthly import',
        createdBy: 'admin-001',
      });

      // Act
      const batch = ImportBatch.reconstitute(props, mockBatchId, mockOrgId);

      // Assert
      expect(batch.type.isMovements()).toBe(true);
      expect(batch.status.isCompleted()).toBe(true);
      expect(batch.fileName).toBe('movements-2026.csv');
      expect(batch.totalRows).toBe(500);
      expect(batch.processedRows).toBe(500);
      expect(batch.validRows).toBe(480);
      expect(batch.invalidRows).toBe(20);
      expect(batch.startedAt).toEqual(startedAt);
      expect(batch.validatedAt).toEqual(validatedAt);
      expect(batch.completedAt).toEqual(completedAt);
      expect(batch.errorMessage).toBeUndefined();
      expect(batch.note).toBe('Monthly import');
      expect(batch.createdBy).toBe('admin-001');
    });

    it('Given: a batch with error message When: accessing errorMessage getter Then: should return the error', () => {
      // Arrange
      const props = createDefaultProps({
        status: ImportStatus.create('FAILED'),
        errorMessage: 'Connection timeout',
      });

      // Act
      const batch = ImportBatch.reconstitute(props, mockBatchId, mockOrgId);

      // Assert
      expect(batch.errorMessage).toBe('Connection timeout');
    });
  });

  describe('domain events', () => {
    it('Given: a new batch When: going through full lifecycle Then: should accumulate domain events', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));

      // Act
      batch.start(); // emits ImportStartedEvent
      batch.markAsValidated(); // emits ImportValidatedEvent
      batch.markAsProcessing(); // no event
      batch.incrementProcessedRows();
      batch.incrementProcessedRows();
      batch.complete(); // emits ImportCompletedEvent

      // Assert
      expect(batch.domainEvents).toHaveLength(3);
      expect(batch.domainEvents[0].eventName).toBe('ImportStarted');
      expect(batch.domainEvents[1].eventName).toBe('ImportValidated');
      expect(batch.domainEvents[2].eventName).toBe('ImportCompleted');
    });

    it('Given: batch with domain events When: clearing events Then: should remove all events', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.start();
      expect(batch.domainEvents).toHaveLength(1);

      // Act
      batch.clearEvents();

      // Assert
      expect(batch.domainEvents).toHaveLength(0);
    });
  });

  describe('full lifecycle', () => {
    it('Given: a new batch When: progressing through PENDING -> VALIDATING -> VALIDATED -> PROCESSING -> COMPLETED Then: should succeed', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.addRow(createValidRow(2));
      batch.addRow(createValidRow(3));

      // Act & Assert: PENDING -> VALIDATING
      batch.start();
      expect(batch.status.isValidating()).toBe(true);
      expect(batch.startedAt).toBeInstanceOf(Date);

      // Act & Assert: VALIDATING -> VALIDATED
      batch.markAsValidated();
      expect(batch.status.isValidated()).toBe(true);
      expect(batch.validRows).toBe(3);
      expect(batch.invalidRows).toBe(0);
      expect(batch.validatedAt).toBeInstanceOf(Date);

      // Act & Assert: VALIDATED -> PROCESSING
      batch.markAsProcessing();
      expect(batch.status.isProcessing()).toBe(true);

      // Act & Assert: Process rows
      batch.incrementProcessedRows();
      batch.incrementProcessedRows();
      batch.incrementProcessedRows();
      expect(batch.processedRows).toBe(3);
      expect(batch.getProgress()).toBe(100);

      // Act & Assert: PROCESSING -> COMPLETED
      batch.complete();
      expect(batch.status.isCompleted()).toBe(true);
      expect(batch.completedAt).toBeInstanceOf(Date);
      expect(batch.canBeRetried()).toBe(false);
    });

    it('Given: a new batch When: failing during processing Then: should allow retry check', () => {
      // Arrange
      const batch = ImportBatch.create(createDefaultProps(), mockOrgId);
      batch.addRow(createValidRow(1));
      batch.start();
      batch.markAsValidated();
      batch.markAsProcessing();
      batch.incrementProcessedRows();

      // Act
      batch.fail('Unexpected database error');

      // Assert
      expect(batch.status.isFailed()).toBe(true);
      expect(batch.errorMessage).toBe('Unexpected database error');
      expect(batch.canBeRetried()).toBe(true);
      expect(batch.processedRows).toBe(1);
    });
  });
});
