import { describe, expect, it } from '@jest/globals';
import { PrismaSpecification } from '@shared/domain/specifications/prismaSpecification.base';
import { PrismaWhereInput } from '@shared/domain/specifications/iPrismaSpecification.port';

// Test entity
class TestEntity {
  constructor(
    public value: number,
    public name: string
  ) {}
}

// Concrete test specification
class ValueGreaterThanSpec extends PrismaSpecification<TestEntity> {
  constructor(private readonly threshold: number) {
    super();
  }

  isSatisfiedBy(entity: TestEntity): boolean {
    return entity.value > this.threshold;
  }

  toPrismaWhere(orgId: string): PrismaWhereInput {
    return { value: { gt: this.threshold }, orgId };
  }
}

class NameEqualsSpec extends PrismaSpecification<TestEntity> {
  constructor(private readonly targetName: string) {
    super();
  }

  isSatisfiedBy(entity: TestEntity): boolean {
    return entity.name === this.targetName;
  }

  toPrismaWhere(orgId: string): PrismaWhereInput {
    return { name: this.targetName, orgId };
  }
}

describe('PrismaSpecification', () => {
  const testOrgId = 'org-123';

  describe('PrismaAndSpecification', () => {
    it('Given: two specs When: both satisfied Then: isSatisfiedBy returns true', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act & Assert
      expect(andSpec.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(true);
    });

    it('Given: two specs When: first not satisfied Then: isSatisfiedBy returns false', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act & Assert
      expect(andSpec.isSatisfiedBy(new TestEntity(3, 'test'))).toBe(false);
    });

    it('Given: two specs When: second not satisfied Then: isSatisfiedBy returns false', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act & Assert
      expect(andSpec.isSatisfiedBy(new TestEntity(10, 'other'))).toBe(false);
    });

    it('Given: two specs When: neither satisfied Then: isSatisfiedBy returns false', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act & Assert
      expect(andSpec.isSatisfiedBy(new TestEntity(3, 'other'))).toBe(false);
    });

    it('Given: two specs When: toPrismaWhere Then: should return AND clause', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act
      const where = andSpec.toPrismaWhere(testOrgId);

      // Assert
      expect(where).toEqual({
        AND: [
          { value: { gt: 5 }, orgId: testOrgId },
          { name: 'test', orgId: testOrgId },
        ],
      });
    });
  });

  describe('PrismaOrSpecification', () => {
    it('Given: two specs When: both satisfied Then: isSatisfiedBy returns true', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);

      // Act & Assert
      expect(orSpec.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(true);
    });

    it('Given: two specs When: only first satisfied Then: isSatisfiedBy returns true', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);

      // Act & Assert
      expect(orSpec.isSatisfiedBy(new TestEntity(10, 'other'))).toBe(true);
    });

    it('Given: two specs When: only second satisfied Then: isSatisfiedBy returns true', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);

      // Act & Assert
      expect(orSpec.isSatisfiedBy(new TestEntity(3, 'test'))).toBe(true);
    });

    it('Given: two specs When: neither satisfied Then: isSatisfiedBy returns false', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);

      // Act & Assert
      expect(orSpec.isSatisfiedBy(new TestEntity(3, 'other'))).toBe(false);
    });

    it('Given: two specs When: toPrismaWhere Then: should return OR clause', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);

      // Act
      const where = orSpec.toPrismaWhere(testOrgId);

      // Assert
      expect(where).toEqual({
        OR: [
          { value: { gt: 5 }, orgId: testOrgId },
          { name: 'test', orgId: testOrgId },
        ],
      });
    });
  });

  describe('PrismaNotSpecification', () => {
    it('Given: spec satisfied When: negated Then: isSatisfiedBy returns false', () => {
      // Arrange
      const spec = new ValueGreaterThanSpec(5);
      const notSpec = spec.not();

      // Act & Assert
      expect(notSpec.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(false);
    });

    it('Given: spec not satisfied When: negated Then: isSatisfiedBy returns true', () => {
      // Arrange
      const spec = new ValueGreaterThanSpec(5);
      const notSpec = spec.not();

      // Act & Assert
      expect(notSpec.isSatisfiedBy(new TestEntity(3, 'test'))).toBe(true);
    });

    it('Given: spec When: toPrismaWhere Then: should return NOT clause', () => {
      // Arrange
      const spec = new ValueGreaterThanSpec(5);
      const notSpec = spec.not();

      // Act
      const where = notSpec.toPrismaWhere(testOrgId);

      // Assert
      expect(where).toEqual({
        NOT: { value: { gt: 5 }, orgId: testOrgId },
      });
    });
  });

  describe('Complex compositions', () => {
    it('Given: AND and OR When: composing Then: should evaluate correctly', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const spec3 = new ValueGreaterThanSpec(100);
      const complexSpec = spec1.and(spec2).or(spec3);

      // Act & Assert
      expect(complexSpec.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(true); // AND satisfied
      expect(complexSpec.isSatisfiedBy(new TestEntity(101, 'other'))).toBe(true); // OR satisfied
      expect(complexSpec.isSatisfiedBy(new TestEntity(3, 'other'))).toBe(false); // Neither
    });

    it('Given: NOT and AND When: composing Then: should evaluate correctly', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const notSpec = spec1.not();
      const spec2 = new NameEqualsSpec('test');
      const composed = notSpec.and(spec2);

      // Act & Assert
      expect(composed.isSatisfiedBy(new TestEntity(3, 'test'))).toBe(true); // NOT(>5) AND name=test
      expect(composed.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(false); // NOT(>5) fails
    });

    it('Given: complex composition When: toPrismaWhere Then: should nest correctly', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);

      // Act
      const where = andSpec.toPrismaWhere(testOrgId);

      // Assert
      expect(where).toHaveProperty('AND');
      expect((where as { AND: unknown[] }).AND).toHaveLength(2);
    });

    it('Given: PrismaAndSpecification When: chaining and() Then: returns new PrismaAndSpecification', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const andSpec = spec1.and(spec2);
      const spec3 = new ValueGreaterThanSpec(3);

      // Act
      const chainedSpec = andSpec.and(spec3);

      // Assert
      const where = chainedSpec.toPrismaWhere(testOrgId);
      expect(where).toHaveProperty('AND');
    });

    it('Given: PrismaOrSpecification When: chaining or() Then: returns new PrismaOrSpecification', () => {
      // Arrange
      const spec1 = new ValueGreaterThanSpec(5);
      const spec2 = new NameEqualsSpec('test');
      const orSpec = spec1.or(spec2);
      const spec3 = new ValueGreaterThanSpec(3);

      // Act
      const chainedSpec = orSpec.or(spec3);

      // Assert
      const where = chainedSpec.toPrismaWhere(testOrgId);
      expect(where).toHaveProperty('OR');
    });

    it('Given: PrismaNotSpecification When: chaining not() Then: returns double negation', () => {
      // Arrange
      const spec = new ValueGreaterThanSpec(5);
      const notSpec = spec.not();
      const doubleNotSpec = notSpec.not();

      // Act & Assert
      expect(doubleNotSpec.isSatisfiedBy(new TestEntity(10, 'test'))).toBe(true);
      expect(doubleNotSpec.isSatisfiedBy(new TestEntity(3, 'test'))).toBe(false);
    });
  });
});
