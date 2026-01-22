import {
  ImportStatus,
  IMPORT_STATUSES,
} from '@import/domain/valueObjects/importStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ImportStatus', () => {
  describe('create', () => {
    it.each([
      ['PENDING'],
      ['VALIDATING'],
      ['VALIDATED'],
      ['PROCESSING'],
      ['COMPLETED'],
      ['FAILED'],
    ])(
      'Given: valid status %s When: creating ImportStatus Then: should create successfully',
      (status: string) => {
        // Act
        const importStatus = ImportStatus.create(status);

        // Assert
        expect(importStatus.getValue()).toBe(status);
      }
    );

    it('Given: invalid status When: creating ImportStatus Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportStatus.create('INVALID')).toThrow(
        'Invalid import status: INVALID. Valid statuses: PENDING, VALIDATING, VALIDATED, PROCESSING, COMPLETED, FAILED'
      );
    });

    it('Given: lowercase status When: creating ImportStatus Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportStatus.create('pending')).toThrow('Invalid import status');
    });

    it('Given: empty string When: creating ImportStatus Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportStatus.create('')).toThrow('Invalid import status');
    });
  });

  describe('isPending', () => {
    it('Given: PENDING status When: checking isPending Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('PENDING');

      // Act & Assert
      expect(status.isPending()).toBe(true);
    });

    it.each([['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking isPending Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isPending()).toBe(false);
      }
    );
  });

  describe('isValidating', () => {
    it('Given: VALIDATING status When: checking isValidating Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('VALIDATING');

      // Act & Assert
      expect(status.isValidating()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking isValidating Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isValidating()).toBe(false);
      }
    );
  });

  describe('isValidated', () => {
    it('Given: VALIDATED status When: checking isValidated Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('VALIDATED');

      // Act & Assert
      expect(status.isValidated()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking isValidated Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isValidated()).toBe(false);
      }
    );
  });

  describe('isProcessing', () => {
    it('Given: PROCESSING status When: checking isProcessing Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('PROCESSING');

      // Act & Assert
      expect(status.isProcessing()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking isProcessing Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isProcessing()).toBe(false);
      }
    );
  });

  describe('isCompleted', () => {
    it('Given: COMPLETED status When: checking isCompleted Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('COMPLETED');

      // Act & Assert
      expect(status.isCompleted()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['FAILED']])(
      'Given: %s status When: checking isCompleted Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isCompleted()).toBe(false);
      }
    );
  });

  describe('isFailed', () => {
    it('Given: FAILED status When: checking isFailed Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('FAILED');

      // Act & Assert
      expect(status.isFailed()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED']])(
      'Given: %s status When: checking isFailed Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isFailed()).toBe(false);
      }
    );
  });

  describe('canValidate', () => {
    it('Given: PENDING status When: checking canValidate Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('PENDING');

      // Act & Assert
      expect(status.canValidate()).toBe(true);
    });

    it.each([['VALIDATING'], ['VALIDATED'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking canValidate Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.canValidate()).toBe(false);
      }
    );
  });

  describe('canProcess', () => {
    it('Given: VALIDATED status When: checking canProcess Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('VALIDATED');

      // Act & Assert
      expect(status.canProcess()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['PROCESSING'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking canProcess Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.canProcess()).toBe(false);
      }
    );
  });

  describe('canComplete', () => {
    it('Given: PROCESSING status When: checking canComplete Then: should return true', () => {
      // Arrange
      const status = ImportStatus.create('PROCESSING');

      // Act & Assert
      expect(status.canComplete()).toBe(true);
    });

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking canComplete Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.canComplete()).toBe(false);
      }
    );
  });

  describe('canFail', () => {
    it.each([['PENDING'], ['VALIDATING'], ['PROCESSING']])(
      'Given: %s status When: checking canFail Then: should return true',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.canFail()).toBe(true);
      }
    );

    it.each([['VALIDATED'], ['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking canFail Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.canFail()).toBe(false);
      }
    );
  });

  describe('isTerminal', () => {
    it.each([['COMPLETED'], ['FAILED']])(
      'Given: %s status When: checking isTerminal Then: should return true',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isTerminal()).toBe(true);
      }
    );

    it.each([['PENDING'], ['VALIDATING'], ['VALIDATED'], ['PROCESSING']])(
      'Given: %s status When: checking isTerminal Then: should return false',
      (statusValue: string) => {
        // Arrange
        const status = ImportStatus.create(statusValue);

        // Act & Assert
        expect(status.isTerminal()).toBe(false);
      }
    );
  });

  describe('getValue', () => {
    it.each([
      ['PENDING'],
      ['VALIDATING'],
      ['VALIDATED'],
      ['PROCESSING'],
      ['COMPLETED'],
      ['FAILED'],
    ])(
      'Given: %s status When: getting value Then: should return correct value',
      (status: string) => {
        // Arrange
        const importStatus = ImportStatus.create(status);

        // Act
        const value = importStatus.getValue();

        // Assert
        expect(value).toBe(status);
      }
    );
  });

  describe('toString', () => {
    it.each([
      ['PENDING'],
      ['VALIDATING'],
      ['VALIDATED'],
      ['PROCESSING'],
      ['COMPLETED'],
      ['FAILED'],
    ])(
      'Given: %s status When: converting to string Then: should return status value',
      (status: string) => {
        // Arrange
        const importStatus = ImportStatus.create(status);

        // Act
        const result = importStatus.toString();

        // Assert
        expect(result).toBe(status);
      }
    );
  });

  describe('IMPORT_STATUSES constant', () => {
    it('Given: IMPORT_STATUSES constant When: checking values Then: should contain all valid statuses', () => {
      // Assert
      expect(IMPORT_STATUSES.PENDING).toBe('PENDING');
      expect(IMPORT_STATUSES.VALIDATING).toBe('VALIDATING');
      expect(IMPORT_STATUSES.VALIDATED).toBe('VALIDATED');
      expect(IMPORT_STATUSES.PROCESSING).toBe('PROCESSING');
      expect(IMPORT_STATUSES.COMPLETED).toBe('COMPLETED');
      expect(IMPORT_STATUSES.FAILED).toBe('FAILED');
    });
  });
});
