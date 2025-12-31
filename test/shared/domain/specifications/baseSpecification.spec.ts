import { BaseSpecification } from '@shared/domain/specifications';

// Test entity for specifications
class TestEntity {
  constructor(public value: number) {}
}

// Concrete specification for testing
class GreaterThanSpecification extends BaseSpecification<TestEntity> {
  constructor(private readonly threshold: number) {
    super();
  }

  public isSatisfiedBy(entity: TestEntity): boolean {
    return entity.value > this.threshold;
  }
}

describe('BaseSpecification', () => {
  describe('AND composition', () => {
    it('Given: two specifications When: combining with AND Then: should return true only when both are satisfied', () => {
      // Arrange
      const spec1 = new GreaterThanSpecification(5);
      const spec2 = new GreaterThanSpecification(10);
      const andSpec = spec1.and(spec2);

      // Act & Assert
      expect(andSpec.isSatisfiedBy(new TestEntity(15))).toBe(true); // Both satisfied
      expect(andSpec.isSatisfiedBy(new TestEntity(7))).toBe(false); // Only first satisfied
      expect(andSpec.isSatisfiedBy(new TestEntity(3))).toBe(false); // Neither satisfied
    });
  });

  describe('OR composition', () => {
    it('Given: two specifications When: combining with OR Then: should return true when either is satisfied', () => {
      // Arrange
      const spec1 = new GreaterThanSpecification(5);
      const spec2 = new GreaterThanSpecification(10);
      const orSpec = spec1.or(spec2);

      // Act & Assert
      expect(orSpec.isSatisfiedBy(new TestEntity(15))).toBe(true); // Both satisfied
      expect(orSpec.isSatisfiedBy(new TestEntity(7))).toBe(true); // First satisfied
      expect(orSpec.isSatisfiedBy(new TestEntity(3))).toBe(false); // Neither satisfied
    });
  });

  describe('NOT composition', () => {
    it('Given: a specification When: negating with NOT Then: should return opposite result', () => {
      // Arrange
      const spec = new GreaterThanSpecification(5);
      const notSpec = spec.not();

      // Act & Assert
      expect(notSpec.isSatisfiedBy(new TestEntity(10))).toBe(false); // Original true, negated false
      expect(notSpec.isSatisfiedBy(new TestEntity(3))).toBe(true); // Original false, negated true
    });
  });

  describe('Complex composition', () => {
    it('Given: multiple specifications When: composing with AND and OR Then: should evaluate correctly', () => {
      // Arrange
      const spec1 = new GreaterThanSpecification(5);
      const spec2 = new GreaterThanSpecification(10);
      const spec3 = new GreaterThanSpecification(15);
      const complexSpec = spec1.and(spec2).or(spec3);

      // Act & Assert
      expect(complexSpec.isSatisfiedBy(new TestEntity(20))).toBe(true); // spec3 satisfied
      expect(complexSpec.isSatisfiedBy(new TestEntity(12))).toBe(true); // spec1 and spec2 satisfied
      expect(complexSpec.isSatisfiedBy(new TestEntity(7))).toBe(false); // Only spec1 satisfied
    });
  });
});
