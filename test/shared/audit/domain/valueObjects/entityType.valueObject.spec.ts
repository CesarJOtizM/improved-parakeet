import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

describe('EntityType Value Object', () => {
  describe('Given: valid entity type When: creating EntityType Then: should create successfully', () => {
    it('should create User entity type', () => {
      // Arrange & Act
      const entityType = EntityType.create('User');

      // Assert
      expect(entityType.getValue()).toBe('User');
      expect(entityType.toString()).toBe('User');
    });

    it('should create Product entity type', () => {
      // Arrange & Act
      const entityType = EntityType.create('Product');

      // Assert
      expect(entityType.getValue()).toBe('Product');
    });

    it('should create Warehouse entity type', () => {
      // Arrange & Act
      const entityType = EntityType.create('Warehouse');

      // Assert
      expect(entityType.getValue()).toBe('Warehouse');
    });
  });

  describe('Given: invalid entity type When: creating EntityType Then: should throw error', () => {
    it('should throw error for invalid entity type', () => {
      // Arrange & Act & Assert
      expect(() => EntityType.create('InvalidEntity' as EntityType['props']['value'])).toThrow(
        'Invalid entity type'
      );
    });
  });

  describe('Given: two EntityTypes When: comparing Then: should compare correctly', () => {
    it('should return true for equal entity types', () => {
      // Arrange
      const type1 = EntityType.create('User');
      const type2 = EntityType.create('User');

      // Act & Assert
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for different entity types', () => {
      // Arrange
      const type1 = EntityType.create('User');
      const type2 = EntityType.create('Product');

      // Act & Assert
      expect(type1.equals(type2)).toBe(false);
    });
  });
});
