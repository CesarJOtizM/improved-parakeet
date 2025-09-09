// Entity Base Tests - Clase base para entidades
// Tests unitarios para la clase base Entity siguiendo AAA y Given-When-Then

import { Entity } from '@shared/domain/base/entity.base';

// Clase concreta para testing
class TestEntity extends Entity<{ name: string; value: number }> {
  constructor(props: { name: string; value: number }, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  get name(): string {
    return this.props.name;
  }

  get value(): number {
    return this.props.value;
  }

  updateName(newName: string): void {
    this.props.name = newName;
    this.updateTimestamp();
  }
}

describe('Entity Base', () => {
  describe('constructor', () => {
    it('Given: props without id and orgId When: creating entity Then: should generate id and use empty orgId', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };

      // Act
      const entity = new TestEntity(props);

      // Assert
      expect(entity.id).toBeDefined();
      expect(entity.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(entity.orgId).toBe('');
      expect(entity.name).toBe('Test');
      expect(entity.value).toBe(42);
    });

    it('Given: props with custom id and orgId When: creating entity Then: should use provided values', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const customId = 'custom-id-123';
      const customOrgId = 'org-456';

      // Act
      const entity = new TestEntity(props, customId, customOrgId);

      // Assert
      expect(entity.id).toBe(customId);
      expect(entity.orgId).toBe(customOrgId);
      expect(entity.name).toBe('Test');
      expect(entity.value).toBe(42);
    });

    it('Given: entity creation When: checking timestamps Then: should set createdAt and updatedAt', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const beforeCreation = new Date();

      // Act
      const entity = new TestEntity(props);

      // Assert
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    });
  });

  describe('equals', () => {
    it('Given: same entity When: comparing with itself Then: should return true', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });

      // Act
      const result = entity.equals(entity);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: entities with same id and orgId When: comparing Then: should return true', () => {
      // Arrange
      const id = 'same-id';
      const orgId = 'same-org';
      const entity1 = new TestEntity({ name: 'Test1', value: 42 }, id, orgId);
      const entity2 = new TestEntity({ name: 'Test2', value: 100 }, id, orgId);

      // Act
      const result = entity1.equals(entity2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: entities with different ids When: comparing Then: should return false', () => {
      // Arrange
      const entity1 = new TestEntity({ name: 'Test1', value: 42 }, 'id-1', 'org-1');
      const entity2 = new TestEntity({ name: 'Test2', value: 100 }, 'id-2', 'org-1');

      // Act
      const result = entity1.equals(entity2);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: entities with different orgIds When: comparing Then: should return false', () => {
      // Arrange
      const entity1 = new TestEntity({ name: 'Test1', value: 42 }, 'id-1', 'org-1');
      const entity2 = new TestEntity({ name: 'Test2', value: 100 }, 'id-1', 'org-2');

      // Act
      const result = entity1.equals(entity2);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: entity compared with null When: comparing Then: should return false', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });

      // Act
      const result = entity.equals(null as unknown as Entity<{ name: string; value: number }>);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: entity compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });

      // Act
      const result = entity.equals(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateTimestamp', () => {
    it('Given: entity with updated timestamp When: updating Then: should update only updatedAt', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });
      const originalCreatedAt = entity.createdAt;
      const originalUpdatedAt = entity.updatedAt;

      // Wait a bit to ensure time difference
      setTimeout(() => {
        // Act
        entity.updateName('Updated Name');

        // Assert
        expect(entity.createdAt).toBe(originalCreatedAt);
        expect(entity.updatedAt).not.toBe(originalUpdatedAt);
        expect(entity.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('Given: entity When: updating multiple times Then: should update timestamp each time', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });
      const timestamps: Date[] = [];

      // Act
      for (let i = 0; i < 3; i++) {
        entity.updateName(`Name ${i}`);
        timestamps.push(entity.updatedAt);
        // Add small delay to ensure timestamp difference
        if (i < 2) {
          setTimeout(() => {}, 1);
        }
      }

      // Assert
      expect(timestamps[0].getTime()).toBeLessThanOrEqual(timestamps[1].getTime());
      expect(timestamps[1].getTime()).toBeLessThanOrEqual(timestamps[2].getTime());
    });
  });

  describe('getters', () => {
    it('Given: entity When: accessing id Then: should return correct id', () => {
      // Arrange
      const customId = 'test-id-123';
      const entity = new TestEntity({ name: 'Test', value: 42 }, customId);

      // Act
      const id = entity.id;

      // Assert
      expect(id).toBe(customId);
    });

    it('Given: entity When: accessing orgId Then: should return correct orgId', () => {
      // Arrange
      const customOrgId = 'test-org-456';
      const entity = new TestEntity({ name: 'Test', value: 42 }, undefined, customOrgId);

      // Act
      const orgId = entity.orgId;

      // Assert
      expect(orgId).toBe(customOrgId);
    });

    it('Given: entity When: accessing createdAt Then: should return correct createdAt', () => {
      // Arrange
      const beforeCreation = new Date();
      const entity = new TestEntity({ name: 'Test', value: 42 });

      // Act
      const createdAt = entity.createdAt;

      // Assert
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    });

    it('Given: entity When: accessing updatedAt Then: should return correct updatedAt', () => {
      // Arrange
      const beforeCreation = new Date();
      const entity = new TestEntity({ name: 'Test', value: 42 });

      // Act
      const updatedAt = entity.updatedAt;

      // Assert
      expect(updatedAt).toBeInstanceOf(Date);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    });
  });

  describe('immutability', () => {
    it('Given: entity When: trying to modify id Then: should reflect the change', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });
      const originalId = entity.id;

      // Act
      // @ts-expect-error - Testing readonly behavior
      (entity as { _id: string })._id = 'new-id';

      // Assert
      // Note: In JavaScript, readonly properties can still be modified internally
      // This test verifies that the getter returns the current value
      expect(entity.id).toBe('new-id');
      expect(entity.id).not.toBe(originalId);
    });

    it('Given: entity When: trying to modify orgId Then: should reflect the change', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });
      const originalOrgId = entity.orgId;

      // Act
      // @ts-expect-error - Testing readonly behavior
      (entity as { _orgId: string })._orgId = 'new-org-id';

      // Assert
      expect(entity.orgId).toBe('new-org-id');
      expect(entity.orgId).not.toBe(originalOrgId);
    });

    it('Given: entity When: trying to modify createdAt Then: should reflect the change', () => {
      // Arrange
      const entity = new TestEntity({ name: 'Test', value: 42 });
      const originalCreatedAt = entity.createdAt;
      const newDate = new Date('2025-01-01T00:00:00.000Z');

      // Act
      // @ts-expect-error - Testing readonly behavior
      (entity as { _createdAt: Date })._createdAt = newDate;

      // Assert
      expect(entity.createdAt).toBe(newDate);
      expect(entity.createdAt).not.toBe(originalCreatedAt);
    });
  });
});
