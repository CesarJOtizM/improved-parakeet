import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';

describe('AuditMetadata Value Object', () => {
  describe('Given: valid metadata When: creating AuditMetadata Then: should create successfully', () => {
    it('should create metadata with object', () => {
      // Arrange
      const metadata = { key: 'value', number: 123 };

      // Act
      const auditMetadata = AuditMetadata.create(metadata);

      // Assert
      expect(auditMetadata.getValue()).toEqual(metadata);
      expect(auditMetadata.isEmpty()).toBe(false);
    });

    it('should create empty metadata', () => {
      // Arrange & Act
      const auditMetadata = AuditMetadata.empty();

      // Assert
      expect(auditMetadata.isEmpty()).toBe(true);
      expect(auditMetadata.getValue()).toEqual({});
    });
  });

  describe('Given: invalid metadata When: creating AuditMetadata Then: should throw error', () => {
    it('should throw error for null metadata', () => {
      // Arrange & Act & Assert
      expect(() => AuditMetadata.create(null as unknown as Record<string, unknown>)).toThrow(
        'Audit metadata must be an object'
      );
    });

    it('should throw error for circular references', () => {
      // Arrange
      const circular: Record<string, unknown> & { self?: unknown } = { key: 'value' };
      circular.self = circular;

      // Act & Assert
      expect(() => AuditMetadata.create(circular)).toThrow('circular references');
    });
  });

  describe('Given: two AuditMetadata When: comparing Then: should compare correctly', () => {
    it('should return true for equal metadata', () => {
      // Arrange
      const metadata1 = AuditMetadata.create({ key: 'value' });
      const metadata2 = AuditMetadata.create({ key: 'value' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('should return false for different metadata', () => {
      // Arrange
      const metadata1 = AuditMetadata.create({ key: 'value1' });
      const metadata2 = AuditMetadata.create({ key: 'value2' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });

  describe('Given: AuditMetadata When: merging Then: should merge correctly', () => {
    it('should merge two metadata objects', () => {
      // Arrange
      const metadata1 = AuditMetadata.create({ key1: 'value1' });
      const metadata2 = AuditMetadata.create({ key2: 'value2' });

      // Act
      const merged = metadata1.merge(metadata2);

      // Assert
      expect(merged.getValue()).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });
});
