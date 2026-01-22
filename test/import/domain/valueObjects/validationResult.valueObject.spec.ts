import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ValidationResult', () => {
  describe('create', () => {
    it('Given: valid true with no errors When: creating ValidationResult Then: should create valid result', () => {
      // Act
      const result = ValidationResult.create(true);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.hasErrors()).toBe(false);
      expect(result.hasWarnings()).toBe(false);
    });

    it('Given: valid false with errors When: creating ValidationResult Then: should create invalid result', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2'];

      // Act
      const result = ValidationResult.create(false, errors);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.getErrors()).toEqual(errors);
    });

    it('Given: valid true with warnings When: creating ValidationResult Then: should create valid result with warnings', () => {
      // Arrange
      const warnings = ['Warning 1'];

      // Act
      const result = ValidationResult.create(true, [], warnings);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.hasWarnings()).toBe(true);
      expect(result.getWarnings()).toEqual(warnings);
    });

    it('Given: valid false with errors and warnings When: creating ValidationResult Then: should create invalid result with both', () => {
      // Arrange
      const errors = ['Error 1'];
      const warnings = ['Warning 1', 'Warning 2'];

      // Act
      const result = ValidationResult.create(false, errors, warnings);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toEqual(errors);
      expect(result.getWarnings()).toEqual(warnings);
    });
  });

  describe('valid', () => {
    it('Given: calling valid static method When: creating Then: should create valid result', () => {
      // Act
      const result = ValidationResult.valid();

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.hasErrors()).toBe(false);
      expect(result.hasWarnings()).toBe(false);
      expect(result.getErrors()).toEqual([]);
      expect(result.getWarnings()).toEqual([]);
    });
  });

  describe('invalid', () => {
    it('Given: errors array When: creating invalid result Then: should create invalid result with errors', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2'];

      // Act
      const result = ValidationResult.invalid(errors);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toEqual(errors);
      expect(result.getWarnings()).toEqual([]);
    });

    it('Given: errors and warnings When: creating invalid result Then: should create invalid result with both', () => {
      // Arrange
      const errors = ['Error 1'];
      const warnings = ['Warning 1'];

      // Act
      const result = ValidationResult.invalid(errors, warnings);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toEqual(errors);
      expect(result.getWarnings()).toEqual(warnings);
    });
  });

  describe('fromErrors', () => {
    it('Given: empty errors array When: creating from errors Then: should create valid result', () => {
      // Act
      const result = ValidationResult.fromErrors([]);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.hasErrors()).toBe(false);
    });

    it('Given: non-empty errors array When: creating from errors Then: should create invalid result', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2'];

      // Act
      const result = ValidationResult.fromErrors(errors);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors()).toEqual(errors);
    });

    it('Given: single error When: creating from errors Then: should create invalid result', () => {
      // Arrange
      const errors = ['Single error'];

      // Act
      const result = ValidationResult.fromErrors(errors);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrorCount()).toBe(1);
    });
  });

  describe('isValid', () => {
    it('Given: valid result When: checking isValid Then: should return true', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act & Assert
      expect(result.isValid()).toBe(true);
    });

    it('Given: invalid result When: checking isValid Then: should return false', () => {
      // Arrange
      const result = ValidationResult.invalid(['Error']);

      // Act & Assert
      expect(result.isValid()).toBe(false);
    });
  });

  describe('hasErrors', () => {
    it('Given: result with errors When: checking hasErrors Then: should return true', () => {
      // Arrange
      const result = ValidationResult.invalid(['Error 1']);

      // Act & Assert
      expect(result.hasErrors()).toBe(true);
    });

    it('Given: result without errors When: checking hasErrors Then: should return false', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act & Assert
      expect(result.hasErrors()).toBe(false);
    });
  });

  describe('hasWarnings', () => {
    it('Given: result with warnings When: checking hasWarnings Then: should return true', () => {
      // Arrange
      const result = ValidationResult.create(true, [], ['Warning 1']);

      // Act & Assert
      expect(result.hasWarnings()).toBe(true);
    });

    it('Given: result without warnings When: checking hasWarnings Then: should return false', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act & Assert
      expect(result.hasWarnings()).toBe(false);
    });
  });

  describe('getErrors', () => {
    it('Given: result with multiple errors When: getting errors Then: should return all errors', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const result = ValidationResult.invalid(errors);

      // Act
      const retrievedErrors = result.getErrors();

      // Assert
      expect(retrievedErrors).toEqual(errors);
      expect(retrievedErrors).toHaveLength(3);
    });

    it('Given: result with no errors When: getting errors Then: should return empty array', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const errors = result.getErrors();

      // Assert
      expect(errors).toEqual([]);
    });
  });

  describe('getWarnings', () => {
    it('Given: result with multiple warnings When: getting warnings Then: should return all warnings', () => {
      // Arrange
      const warnings = ['Warning 1', 'Warning 2'];
      const result = ValidationResult.create(true, [], warnings);

      // Act
      const retrievedWarnings = result.getWarnings();

      // Assert
      expect(retrievedWarnings).toEqual(warnings);
      expect(retrievedWarnings).toHaveLength(2);
    });

    it('Given: result with no warnings When: getting warnings Then: should return empty array', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const warnings = result.getWarnings();

      // Assert
      expect(warnings).toEqual([]);
    });
  });

  describe('getAllMessages', () => {
    it('Given: result with errors and warnings When: getting all messages Then: should return combined array', () => {
      // Arrange
      const errors = ['Error 1'];
      const warnings = ['Warning 1'];
      const result = ValidationResult.create(false, errors, warnings);

      // Act
      const allMessages = result.getAllMessages();

      // Assert
      expect(allMessages).toEqual(['Error 1', 'Warning 1']);
    });

    it('Given: result with only errors When: getting all messages Then: should return only errors', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2'];
      const result = ValidationResult.invalid(errors);

      // Act
      const allMessages = result.getAllMessages();

      // Assert
      expect(allMessages).toEqual(errors);
    });

    it('Given: result with no messages When: getting all messages Then: should return empty array', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const allMessages = result.getAllMessages();

      // Assert
      expect(allMessages).toEqual([]);
    });
  });

  describe('getErrorCount', () => {
    it('Given: result with 3 errors When: getting error count Then: should return 3', () => {
      // Arrange
      const result = ValidationResult.invalid(['Error 1', 'Error 2', 'Error 3']);

      // Act & Assert
      expect(result.getErrorCount()).toBe(3);
    });

    it('Given: result with no errors When: getting error count Then: should return 0', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act & Assert
      expect(result.getErrorCount()).toBe(0);
    });
  });

  describe('getWarningCount', () => {
    it('Given: result with 2 warnings When: getting warning count Then: should return 2', () => {
      // Arrange
      const result = ValidationResult.create(true, [], ['Warning 1', 'Warning 2']);

      // Act & Assert
      expect(result.getWarningCount()).toBe(2);
    });

    it('Given: result with no warnings When: getting warning count Then: should return 0', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act & Assert
      expect(result.getWarningCount()).toBe(0);
    });
  });

  describe('merge', () => {
    it('Given: two valid results When: merging Then: should return valid result', () => {
      // Arrange
      const result1 = ValidationResult.valid();
      const result2 = ValidationResult.valid();

      // Act
      const merged = result1.merge(result2);

      // Assert
      expect(merged.isValid()).toBe(true);
    });

    it('Given: valid and invalid results When: merging Then: should return invalid result', () => {
      // Arrange
      const result1 = ValidationResult.valid();
      const result2 = ValidationResult.invalid(['Error from result2']);

      // Act
      const merged = result1.merge(result2);

      // Assert
      expect(merged.isValid()).toBe(false);
      expect(merged.getErrors()).toContain('Error from result2');
    });

    it('Given: two invalid results When: merging Then: should combine all errors', () => {
      // Arrange
      const result1 = ValidationResult.invalid(['Error 1']);
      const result2 = ValidationResult.invalid(['Error 2']);

      // Act
      const merged = result1.merge(result2);

      // Assert
      expect(merged.isValid()).toBe(false);
      expect(merged.getErrors()).toEqual(['Error 1', 'Error 2']);
    });

    it('Given: results with warnings When: merging Then: should combine all warnings', () => {
      // Arrange
      const result1 = ValidationResult.create(true, [], ['Warning 1']);
      const result2 = ValidationResult.create(true, [], ['Warning 2']);

      // Act
      const merged = result1.merge(result2);

      // Assert
      expect(merged.isValid()).toBe(true);
      expect(merged.getWarnings()).toEqual(['Warning 1', 'Warning 2']);
    });

    it('Given: results with errors and warnings When: merging Then: should combine all messages', () => {
      // Arrange
      const result1 = ValidationResult.create(false, ['Error 1'], ['Warning 1']);
      const result2 = ValidationResult.create(false, ['Error 2'], ['Warning 2']);

      // Act
      const merged = result1.merge(result2);

      // Assert
      expect(merged.isValid()).toBe(false);
      expect(merged.getErrors()).toEqual(['Error 1', 'Error 2']);
      expect(merged.getWarnings()).toEqual(['Warning 1', 'Warning 2']);
    });
  });

  describe('addError', () => {
    it('Given: valid result When: adding error Then: should return invalid result with error', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const newResult = result.addError('New error');

      // Assert
      expect(newResult.isValid()).toBe(false);
      expect(newResult.getErrors()).toContain('New error');
    });

    it('Given: invalid result When: adding error Then: should append error to existing', () => {
      // Arrange
      const result = ValidationResult.invalid(['Existing error']);

      // Act
      const newResult = result.addError('New error');

      // Assert
      expect(newResult.getErrors()).toEqual(['Existing error', 'New error']);
    });

    it('Given: result with warnings When: adding error Then: should preserve warnings', () => {
      // Arrange
      const result = ValidationResult.create(true, [], ['Warning']);

      // Act
      const newResult = result.addError('New error');

      // Assert
      expect(newResult.isValid()).toBe(false);
      expect(newResult.getWarnings()).toEqual(['Warning']);
    });
  });

  describe('addWarning', () => {
    it('Given: valid result When: adding warning Then: should return valid result with warning', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const newResult = result.addWarning('New warning');

      // Assert
      expect(newResult.isValid()).toBe(true);
      expect(newResult.getWarnings()).toContain('New warning');
    });

    it('Given: result with warnings When: adding warning Then: should append warning', () => {
      // Arrange
      const result = ValidationResult.create(true, [], ['Existing warning']);

      // Act
      const newResult = result.addWarning('New warning');

      // Assert
      expect(newResult.getWarnings()).toEqual(['Existing warning', 'New warning']);
    });

    it('Given: invalid result When: adding warning Then: should preserve invalid state', () => {
      // Arrange
      const result = ValidationResult.invalid(['Error']);

      // Act
      const newResult = result.addWarning('New warning');

      // Assert
      expect(newResult.isValid()).toBe(false);
      expect(newResult.getWarnings()).toEqual(['New warning']);
    });
  });

  describe('getValue', () => {
    it('Given: valid result When: getting value Then: should return correct structure', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const value = result.getValue();

      // Assert
      expect(value).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });
    });

    it('Given: invalid result with errors and warnings When: getting value Then: should return all data', () => {
      // Arrange
      const errors = ['Error 1'];
      const warnings = ['Warning 1'];
      const result = ValidationResult.create(false, errors, warnings);

      // Act
      const value = result.getValue();

      // Assert
      expect(value).toEqual({
        isValid: false,
        errors: ['Error 1'],
        warnings: ['Warning 1'],
      });
    });
  });

  describe('toString', () => {
    it('Given: valid result When: converting to string Then: should return Valid', () => {
      // Arrange
      const result = ValidationResult.valid();

      // Act
      const str = result.toString();

      // Assert
      expect(str).toBe('Valid');
    });

    it('Given: invalid result with one error When: converting to string Then: should return error message', () => {
      // Arrange
      const result = ValidationResult.invalid(['Single error']);

      // Act
      const str = result.toString();

      // Assert
      expect(str).toBe('Invalid: Single error');
    });

    it('Given: invalid result with multiple errors When: converting to string Then: should return joined errors', () => {
      // Arrange
      const result = ValidationResult.invalid(['Error 1', 'Error 2']);

      // Act
      const str = result.toString();

      // Assert
      expect(str).toBe('Invalid: Error 1, Error 2');
    });
  });
});
