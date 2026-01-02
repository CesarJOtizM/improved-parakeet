import { describe, expect, it } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';

describe('Category', () => {
  describe('create', () => {
    it('Given: valid props When: creating category Then: should create successfully', () => {
      // Arrange
      const props = {
        name: 'Electronics',
        description: 'Electronic products',
      };

      // Act
      const category = Category.create(props, 'org-123');

      // Assert
      expect(category.name).toBe('Electronics');
      expect(category.description).toBe('Electronic products');
      expect(category.parentId).toBeUndefined();
      expect(category.orgId).toBe('org-123');
    });

    it('Given: props with parentId When: creating category Then: should create child category', () => {
      // Arrange
      const props = {
        name: 'Smartphones',
        parentId: 'parent-123',
        description: 'Mobile phones',
      };

      // Act
      const category = Category.create(props, 'org-123');

      // Assert
      expect(category.name).toBe('Smartphones');
      expect(category.parentId).toBe('parent-123');
      expect(category.isChild()).toBe(true);
      expect(category.isRoot()).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = {
        name: 'Clothing',
        description: 'Apparel products',
      };

      // Act
      const category = Category.reconstitute(props, 'cat-123', 'org-123');

      // Assert
      expect(category.id).toBe('cat-123');
      expect(category.orgId).toBe('org-123');
      expect(category.name).toBe('Clothing');
    });
  });

  describe('update', () => {
    it('Given: existing category When: updating name Then: should update name', () => {
      // Arrange
      const category = Category.create({ name: 'Old Name' }, 'org-123');

      // Act
      category.update({ name: 'New Name' });

      // Assert
      expect(category.name).toBe('New Name');
    });

    it('Given: existing category When: updating parentId Then: should update parentId', () => {
      // Arrange
      const category = Category.create({ name: 'Category' }, 'org-123');

      // Act
      category.update({ parentId: 'parent-456' });

      // Assert
      expect(category.parentId).toBe('parent-456');
      expect(category.isChild()).toBe(true);
    });

    it('Given: existing category When: updating description Then: should update description', () => {
      // Arrange
      const category = Category.create({ name: 'Category' }, 'org-123');

      // Act
      category.update({ description: 'New description' });

      // Assert
      expect(category.description).toBe('New description');
    });
  });

  describe('isRoot', () => {
    it('Given: category without parent When: checking isRoot Then: should return true', () => {
      // Arrange
      const category = Category.create({ name: 'Root Category' }, 'org-123');

      // Act & Assert
      expect(category.isRoot()).toBe(true);
    });

    it('Given: category with parent When: checking isRoot Then: should return false', () => {
      // Arrange
      const category = Category.create({ name: 'Child', parentId: 'parent-123' }, 'org-123');

      // Act & Assert
      expect(category.isRoot()).toBe(false);
    });
  });

  describe('isChild', () => {
    it('Given: category with parent When: checking isChild Then: should return true', () => {
      // Arrange
      const category = Category.create({ name: 'Child', parentId: 'parent-123' }, 'org-123');

      // Act & Assert
      expect(category.isChild()).toBe(true);
    });

    it('Given: category without parent When: checking isChild Then: should return false', () => {
      // Arrange
      const category = Category.create({ name: 'Root' }, 'org-123');

      // Act & Assert
      expect(category.isChild()).toBe(false);
    });
  });
});
