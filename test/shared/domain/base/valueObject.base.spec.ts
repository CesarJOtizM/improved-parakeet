// Value Object Base Tests - Clase base para value objects
// Tests unitarios para la clase base de value objects siguiendo AAA y Given-When-Then

import { IValueObjectProps, ValueObject } from '@shared/domain/base/valueObject.base';

// Clase de prueba para ValueObject
class TestValueObject extends ValueObject<{ value: string }> {
  constructor(value: string) {
    super({ value });
  }

  getValue(): string {
    return this.props.value;
  }
}

class NumberValueObject extends ValueObject<{ value: number }> {
  constructor(value: number) {
    super({ value });
  }

  getValue(): number {
    return this.props.value;
  }
}

describe('Value Object Base', () => {
  describe('ValueObject', () => {
    it('Given: value object When: creating instance Then: should create with frozen props', () => {
      // Arrange
      const testValue = 'test-value';

      // Act
      const valueObject = new TestValueObject(testValue);

      // Assert
      expect(valueObject.getValue()).toBe(testValue);
      expect(Object.isFrozen(valueObject.props)).toBe(true);
    });

    it('Given: two value objects with same value When: comparing Then: should be equal', () => {
      // Arrange
      const value1 = new TestValueObject('same-value');
      const value2 = new TestValueObject('same-value');

      // Act & Assert
      expect(value1.equals(value2)).toBe(true);
    });

    it('Given: two value objects with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const value1 = new TestValueObject('value1');
      const value2 = new TestValueObject('value2');

      // Act & Assert
      expect(value1.equals(value2)).toBe(false);
    });

    it('Given: value object When: comparing with itself Then: should be equal', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act & Assert
      expect(valueObject.equals(valueObject)).toBe(true);
    });

    it('Given: value object When: comparing with null Then: should not be equal', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act & Assert
      expect(valueObject.equals(null)).toBe(false);
    });

    it('Given: value object When: comparing with undefined Then: should not be equal', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act & Assert
      expect(valueObject.equals(undefined)).toBe(false);
    });

    it('Given: number value object When: creating instance Then: should handle number values', () => {
      // Arrange
      const testValue = 42;

      // Act
      const valueObject = new NumberValueObject(testValue);

      // Assert
      expect(valueObject.getValue()).toBe(testValue);
      expect(typeof valueObject.getValue()).toBe('number');
    });

    it('Given: value object When: accessing props Then: should return frozen object', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act
      const props = valueObject.props;

      // Assert
      expect(Object.isFrozen(props)).toBe(true);
    });

    it('Given: value objects with different props structure When: comparing Then: should not be equal', () => {
      // Arrange
      class ComplexValueObject extends ValueObject<{ value: string; extra: number }> {
        constructor(value: string, extra: number) {
          super({ value, extra });
        }
      }

      const value1 = new TestValueObject('test');
      const value2 = new ComplexValueObject('test', 42);

      // Act & Assert
      expect(value1.equals(value2)).toBe(false);
    });

    it('Given: value objects with same props structure When: comparing Then: should be equal', () => {
      // Arrange
      const value1 = new TestValueObject('test');
      const value2 = new TestValueObject('test');

      // Act & Assert
      expect(value1.equals(value2)).toBe(true);
    });

    it('Given: value object When: accessing props Then: should return frozen object', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act
      const props = valueObject.props;

      // Assert
      expect(Object.isFrozen(props)).toBe(true);
      expect(props.value).toBe('test-value');
    });

    it('Given: value object When: trying to modify props Then: should not allow modification', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act & Assert
      expect(() => {
        // @ts-expect-error - Testing readonly behavior
        valueObject.props.value = 'modified-value';
      }).toThrow();
    });

    it('Given: complex value object When: comparing Then: should compare JSON representation', () => {
      // Arrange
      class ComplexValueObject extends ValueObject<{ value: { name: string; age: number } }> {
        constructor(value: { name: string; age: number }) {
          super({ value });
        }

        getValue() {
          return this.props.value;
        }
      }

      const value1 = new ComplexValueObject({ name: 'John', age: 30 });
      const value2 = new ComplexValueObject({ name: 'John', age: 30 });
      const value3 = new ComplexValueObject({ name: 'Jane', age: 25 });

      // Act & Assert
      expect(value1.equals(value2)).toBe(true);
      expect(value1.equals(value3)).toBe(false);
    });

    it('Given: value object When: calling getValue Then: should return correct value', () => {
      // Arrange
      const testValue = 'test-value';
      const valueObject = new TestValueObject(testValue);

      // Act
      const result = valueObject.getValue();

      // Assert
      expect(result).toBe(testValue);
    });

    it('Given: value object When: checking props structure Then: should have correct interface', () => {
      // Arrange
      const valueObject = new TestValueObject('test-value');

      // Act & Assert
      expect(valueObject.props).toHaveProperty('value');
      expect(typeof valueObject.props.value).toBe('string');
    });
  });

  describe('IValueObjectProps interface', () => {
    it('Given: value object props When: checking interface Then: should have value property', () => {
      // Arrange
      const props: IValueObjectProps = { value: 'test' };

      // Act & Assert
      expect(props).toHaveProperty('value');
      expect(props.value).toBe('test');
    });

    it('Given: value object props When: checking type Then: should accept any value type', () => {
      // Arrange
      const stringProps: IValueObjectProps = { value: 'string' };
      const numberProps: IValueObjectProps = { value: 42 };
      const booleanProps: IValueObjectProps = { value: true };
      const objectProps: IValueObjectProps = { value: { key: 'value' } };

      // Act & Assert
      expect(typeof stringProps.value).toBe('string');
      expect(typeof numberProps.value).toBe('number');
      expect(typeof booleanProps.value).toBe('boolean');
      expect(typeof objectProps.value).toBe('object');
    });
  });
});
