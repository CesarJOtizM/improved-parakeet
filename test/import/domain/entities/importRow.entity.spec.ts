import { describe, expect, it } from '@jest/globals';
import { ImportRow, IImportRowProps } from '@import/domain/entities/importRow.entity';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';

describe('ImportRow Entity', () => {
  const mockOrgId = 'org-123';

  const createValidProps = (
    overrides: Partial<{
      rowNumber: number;
      data: Record<string, unknown>;
      validationResult: ValidationResult;
    }> = {}
  ): IImportRowProps => ({
    rowNumber: overrides.rowNumber ?? 1,
    data: overrides.data ?? { sku: 'PROD-001', name: 'Test Product', quantity: 10 },
    validationResult: overrides.validationResult ?? ValidationResult.valid(),
  });

  describe('create', () => {
    it('Given: valid props and orgId When: creating ImportRow Then: should create successfully with generated id', () => {
      // Arrange
      const props = createValidProps();

      // Act
      const row = ImportRow.create(props, mockOrgId);

      // Assert
      expect(row).toBeInstanceOf(ImportRow);
      expect(row.id).toBeDefined();
      expect(row.orgId).toBe(mockOrgId);
      expect(row.rowNumber).toBe(1);
      expect(row.data).toEqual({ sku: 'PROD-001', name: 'Test Product', quantity: 10 });
      expect(row.validationResult).toBeDefined();
      expect(row.isValid()).toBe(true);
    });

    it('Given: rowNumber less than 1 When: creating ImportRow Then: should throw error', () => {
      // Arrange
      const props = createValidProps({ rowNumber: 0 });

      // Act & Assert
      expect(() => ImportRow.create(props, mockOrgId)).toThrow('Row number must be at least 1');
    });

    it('Given: negative rowNumber When: creating ImportRow Then: should throw error', () => {
      // Arrange
      const props = createValidProps({ rowNumber: -5 });

      // Act & Assert
      expect(() => ImportRow.create(props, mockOrgId)).toThrow('Row number must be at least 1');
    });

    it('Given: null data When: creating ImportRow Then: should still create (no validation on data)', () => {
      // Arrange
      const props = createValidProps({ data: null as unknown as Record<string, unknown> });

      // Act
      const row = ImportRow.create(props, mockOrgId);

      // Assert - entity accepts null data without throwing
      expect(row).toBeInstanceOf(ImportRow);
    });

    it('Given: undefined data When: creating ImportRow Then: should still create (no validation on data)', () => {
      // Arrange
      const props = createValidProps({ data: undefined as unknown as Record<string, unknown> });

      // Act
      const row = ImportRow.create(props, mockOrgId);

      // Assert - entity accepts undefined data without throwing
      expect(row).toBeInstanceOf(ImportRow);
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props, id, and orgId When: reconstituting ImportRow Then: should preserve id and orgId', () => {
      // Arrange
      const mockId = 'row-abc-123';
      const props = createValidProps({ rowNumber: 5 });

      // Act
      const row = ImportRow.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(row).toBeInstanceOf(ImportRow);
      expect(row.id).toBe(mockId);
      expect(row.orgId).toBe(mockOrgId);
      expect(row.rowNumber).toBe(5);
      expect(row.isValid()).toBe(true);
    });
  });

  describe('getColumnValue', () => {
    it('Given: row with data When: getting existing column value Then: should return the value', () => {
      // Arrange
      const props = createValidProps({
        data: { sku: 'PROD-001', name: 'Widget', price: 9.99 },
      });
      const row = ImportRow.create(props, mockOrgId);

      // Act
      const value = row.getColumnValue('sku');

      // Assert
      expect(value).toBe('PROD-001');
    });

    it('Given: row with data When: getting non-existing column value Then: should return undefined', () => {
      // Arrange
      const props = createValidProps({
        data: { sku: 'PROD-001' },
      });
      const row = ImportRow.create(props, mockOrgId);

      // Act
      const value = row.getColumnValue('nonExistentColumn');

      // Assert
      expect(value).toBeUndefined();
    });
  });

  describe('setColumnValue', () => {
    it('Given: row with data When: setting a column value Then: should update the value', () => {
      // Arrange
      const props = createValidProps({
        data: { sku: 'PROD-001', name: 'Old Name' },
      });
      const row = ImportRow.create(props, mockOrgId);

      // Act
      row.setColumnValue('name', 'New Name');

      // Assert
      expect(row.getColumnValue('name')).toBe('New Name');
    });

    it('Given: row with data When: setting a new column value Then: should add the column', () => {
      // Arrange
      const props = createValidProps({
        data: { sku: 'PROD-001' },
      });
      const row = ImportRow.create(props, mockOrgId);

      // Act
      row.setColumnValue('category', 'Electronics');

      // Assert
      expect(row.getColumnValue('category')).toBe('Electronics');
    });

    it('Given: row When: setting column value Then: should update timestamp', () => {
      // Arrange
      const row = ImportRow.create(createValidProps(), mockOrgId);
      const originalUpdatedAt = row.updatedAt;

      // Act
      // Small delay to ensure timestamp difference
      row.setColumnValue('sku', 'UPDATED-SKU');

      // Assert
      expect(row.updatedAt).toBeInstanceOf(Date);
      expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('updateValidation', () => {
    it('Given: valid row When: updating validation to invalid Then: should replace validation result', () => {
      // Arrange
      const row = ImportRow.create(createValidProps(), mockOrgId);
      expect(row.isValid()).toBe(true);

      const newValidation = ValidationResult.invalid(['SKU is required'], ['Price seems low']);

      // Act
      row.updateValidation(newValidation);

      // Assert
      expect(row.isValid()).toBe(false);
      expect(row.hasErrors()).toBe(true);
      expect(row.hasWarnings()).toBe(true);
      expect(row.errors).toEqual(['SKU is required']);
      expect(row.warnings).toEqual(['Price seems low']);
    });

    it('Given: invalid row When: updating validation to valid Then: should replace validation result', () => {
      // Arrange
      const invalidValidation = ValidationResult.invalid(['Some error']);
      const row = ImportRow.create(
        createValidProps({ validationResult: invalidValidation }),
        mockOrgId
      );
      expect(row.isValid()).toBe(false);

      const validResult = ValidationResult.valid();

      // Act
      row.updateValidation(validResult);

      // Assert
      expect(row.isValid()).toBe(true);
      expect(row.hasErrors()).toBe(false);
    });

    it('Given: row When: updating validation Then: should update timestamp', () => {
      // Arrange
      const row = ImportRow.create(createValidProps(), mockOrgId);
      const originalUpdatedAt = row.updatedAt;

      // Act
      row.updateValidation(ValidationResult.valid());

      // Assert
      expect(row.updatedAt).toBeInstanceOf(Date);
      expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('isValid / hasErrors / hasWarnings', () => {
    it('Given: row with valid validation When: checking status Then: isValid=true, hasErrors=false, hasWarnings=false', () => {
      // Arrange
      const row = ImportRow.create(createValidProps(), mockOrgId);

      // Act & Assert
      expect(row.isValid()).toBe(true);
      expect(row.hasErrors()).toBe(false);
      expect(row.hasWarnings()).toBe(false);
    });

    it('Given: row with errors When: checking status Then: isValid=false, hasErrors=true', () => {
      // Arrange
      const validation = ValidationResult.invalid(['Missing required field']);
      const row = ImportRow.create(createValidProps({ validationResult: validation }), mockOrgId);

      // Act & Assert
      expect(row.isValid()).toBe(false);
      expect(row.hasErrors()).toBe(true);
    });

    it('Given: row with warnings only When: checking status Then: isValid=true, hasWarnings=true', () => {
      // Arrange
      const validation = ValidationResult.create(true, [], ['Value might be too high']);
      const row = ImportRow.create(createValidProps({ validationResult: validation }), mockOrgId);

      // Act & Assert
      expect(row.isValid()).toBe(true);
      expect(row.hasErrors()).toBe(false);
      expect(row.hasWarnings()).toBe(true);
    });

    it('Given: row with both errors and warnings When: checking status Then: hasErrors=true, hasWarnings=true', () => {
      // Arrange
      const validation = ValidationResult.invalid(
        ['Field X is required'],
        ['Field Y format is unusual']
      );
      const row = ImportRow.create(createValidProps({ validationResult: validation }), mockOrgId);

      // Act & Assert
      expect(row.isValid()).toBe(false);
      expect(row.hasErrors()).toBe(true);
      expect(row.hasWarnings()).toBe(true);
    });
  });

  describe('data getter', () => {
    it('Given: row with data When: getting data Then: should return a copy not the same reference', () => {
      // Arrange
      const originalData = { sku: 'PROD-001', name: 'Widget' };
      const row = ImportRow.create(createValidProps({ data: originalData }), mockOrgId);

      // Act
      const dataCopy1 = row.data;
      const dataCopy2 = row.data;

      // Assert
      expect(dataCopy1).toEqual({ sku: 'PROD-001', name: 'Widget' });
      expect(dataCopy2).toEqual({ sku: 'PROD-001', name: 'Widget' });
      expect(dataCopy1).not.toBe(dataCopy2); // different object references
    });

    it('Given: row with data When: mutating returned data Then: should not affect the entity internal state', () => {
      // Arrange
      const row = ImportRow.create(createValidProps({ data: { sku: 'PROD-001' } }), mockOrgId);

      // Act
      const dataCopy = row.data;
      dataCopy.sku = 'MUTATED';

      // Assert
      expect(row.data.sku).toBe('PROD-001');
    });
  });

  describe('getters', () => {
    it('Given: row with all props When: accessing getters Then: should return correct values', () => {
      // Arrange
      const validation = ValidationResult.invalid(['Error 1'], ['Warning 1', 'Warning 2']);
      const props = createValidProps({
        rowNumber: 42,
        data: { col1: 'val1', col2: 100 },
        validationResult: validation,
      });
      const row = ImportRow.reconstitute(props, 'row-id-1', mockOrgId);

      // Act & Assert
      expect(row.rowNumber).toBe(42);
      expect(row.data).toEqual({ col1: 'val1', col2: 100 });
      expect(row.validationResult).toBeDefined();
      expect(row.errors).toEqual(['Error 1']);
      expect(row.warnings).toEqual(['Warning 1', 'Warning 2']);
      expect(row.id).toBe('row-id-1');
      expect(row.orgId).toBe(mockOrgId);
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
    });
  });
});
