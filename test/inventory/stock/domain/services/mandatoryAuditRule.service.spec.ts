import { MandatoryAuditRule } from '@inventory/stock/domain/services/mandatoryAuditRule.service';
import { describe, expect, it } from '@jest/globals';

describe('MandatoryAuditRule', () => {
  describe('validateAuditRequired', () => {
    it('Given: critical operation with non-critical entity When: validating Then: should return valid response', () => {
      // Arrange
      const operation = 'CREATE';
      const entityType = 'NonCritical';

      // Act
      const result = MandatoryAuditRule.validateAuditRequired(operation, entityType);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('Given: non-critical operation with critical entity When: validating Then: should return valid response', () => {
      // Arrange
      const operation = 'READ';
      const entityType = 'Product';

      // Act
      const result = MandatoryAuditRule.validateAuditRequired(operation, entityType);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('requiresAudit', () => {
    it('Given: critical operation and critical entity When: checking Then: should require audit', () => {
      // Arrange
      const operation = 'create';
      const entityType = 'Product';

      // Act
      const result = MandatoryAuditRule.requiresAudit(operation, entityType);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-critical operation When: checking Then: should not require audit', () => {
      // Arrange
      const operation = 'READ';
      const entityType = 'Product';

      // Act
      const result = MandatoryAuditRule.requiresAudit(operation, entityType);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('critical lists', () => {
    it('Given: lists When: retrieving Then: should return copies', () => {
      // Arrange
      const operations = MandatoryAuditRule.getCriticalOperations();
      const entities = MandatoryAuditRule.getCriticalEntityTypes();

      // Act
      operations.push('CUSTOM');
      entities.push('Custom');

      // Assert
      expect(MandatoryAuditRule.getCriticalOperations()).not.toContain('CUSTOM');
      expect(MandatoryAuditRule.getCriticalEntityTypes()).not.toContain('Custom');
    });
  });
});
