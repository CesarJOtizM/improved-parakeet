// Result Monad Tests - Unit tests for Result monad
// Tests unitarios para el monad Result siguiendo AAA y Given-When-Then

import { describe, expect, it } from '@jest/globals';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';
import { err, ok } from '@shared/domain/result/result';

describe('Result', () => {
  describe('ok', () => {
    it('Given: valid value When: creating ok result Then: should return success result', () => {
      // Arrange
      const value = 'test';

      // Act
      const result = ok(value);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('Given: number value When: creating ok result Then: should return success result with number', () => {
      // Arrange
      const value = 42;

      // Act
      const result = ok(value);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('Given: object value When: creating ok result Then: should return success result with object', () => {
      // Arrange
      const value = { id: '123', name: 'test' };

      // Act
      const result = ok(value);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(value);
    });
  });

  describe('err', () => {
    it('Given: error message When: creating err result Then: should return error result', () => {
      // Arrange
      const error = 'Error message';

      // Act
      const result = err<unknown, string>(error);

      // Assert
      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
    });

    it('Given: Error object When: creating err result Then: should return error result', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      const result = err<unknown, Error>(error);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapOrElse(e => e)).toBe(error);
    });

    it('Given: DomainError When: creating err result Then: should return error result', () => {
      // Arrange
      const error = new ValidationError('Validation failed');

      // Act
      const result = err<unknown, DomainError>(error);

      // Assert
      expect(result.isErr()).toBe(true);
    });
  });

  describe('isOk', () => {
    it('Given: ok result When: checking isOk Then: should return true', () => {
      // Arrange
      const result = ok('test');

      // Act
      const isOk = result.isOk();

      // Assert
      expect(isOk).toBe(true);
    });

    it('Given: err result When: checking isOk Then: should return false', () => {
      // Arrange
      const result = err<unknown, string>('error');

      // Act
      const isOk = result.isOk();

      // Assert
      expect(isOk).toBe(false);
    });
  });

  describe('isErr', () => {
    it('Given: ok result When: checking isErr Then: should return false', () => {
      // Arrange
      const result = ok('test');

      // Act
      const isErr = result.isErr();

      // Assert
      expect(isErr).toBe(false);
    });

    it('Given: err result When: checking isErr Then: should return true', () => {
      // Arrange
      const result = err<unknown, string>('error');

      // Act
      const isErr = result.isErr();

      // Assert
      expect(isErr).toBe(true);
    });
  });

  describe('map', () => {
    it('Given: ok result with number When: mapping to string Then: should return ok result with string', () => {
      // Arrange
      const result = ok(42);

      // Act
      const mapped = result.map(value => String(value));

      // Assert
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe('42');
    });

    it('Given: err result When: mapping Then: should return same err result', () => {
      // Arrange
      const result = err<unknown, string>('error');

      // Act
      const mapped = result.map(value => value);

      // Assert
      expect(mapped.isErr()).toBe(true);
    });

    it('Given: ok result When: mapping with transformation Then: should apply transformation', () => {
      // Arrange
      const result = ok({ name: 'test' });

      // Act
      const mapped = result.map(value => ({ ...value, id: '123' }));

      // Assert
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toEqual({ name: 'test', id: '123' });
    });
  });

  describe('flatMap', () => {
    it('Given: ok result When: flatMapping to another ok result Then: should return chained ok result', () => {
      // Arrange
      const result = ok(5);

      // Act
      const flatMapped = result.flatMap(value => ok(value * 2));

      // Assert
      expect(flatMapped.isOk()).toBe(true);
      expect(flatMapped.unwrap()).toBe(10);
    });

    it('Given: ok result When: flatMapping to err result Then: should return err result', () => {
      // Arrange
      const result = ok<number, string>(5);

      // Act
      const flatMapped = result.flatMap(() => err<number, string>('mapped error'));

      // Assert
      expect(flatMapped.isErr()).toBe(true);
    });

    it('Given: err result When: flatMapping Then: should return same err result', () => {
      // Arrange
      const result = err<unknown, string>('error');

      // Act
      const flatMapped = result.flatMap(() => ok('success'));

      // Assert
      expect(flatMapped.isErr()).toBe(true);
    });
  });

  describe('mapErr', () => {
    it('Given: ok result When: mapping error Then: should return same ok result', () => {
      // Arrange
      const result = ok('test');

      // Act
      const mapped = result.mapErr(error => `Mapped: ${error}`);

      // Assert
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe('test');
    });

    it('Given: err result When: mapping error Then: should return err result with transformed error', () => {
      // Arrange
      const result = err<unknown, string>('original error');

      // Act
      const mapped = result.mapErr(error => `Mapped: ${error}`);

      // Assert
      expect(mapped.isErr()).toBe(true);
      expect(mapped.unwrapOrElse(e => e)).toBe('Mapped: original error');
    });
  });

  describe('unwrap', () => {
    it('Given: ok result When: unwrapping Then: should return value', () => {
      // Arrange
      const result = ok('test');

      // Act
      const value = result.unwrap();

      // Assert
      expect(value).toBe('test');
    });

    it('Given: err result When: unwrapping Then: should throw error', () => {
      // Arrange
      const result = err<unknown, string>('error');

      // Act & Assert
      expect(() => result.unwrap()).toThrow();
    });
  });

  describe('unwrapOr', () => {
    it('Given: ok result When: unwrapping with default Then: should return value', () => {
      // Arrange
      const result = ok('test');

      // Act
      const value = result.unwrapOr('default');

      // Assert
      expect(value).toBe('test');
    });

    it('Given: err result When: unwrapping with default Then: should return default value', () => {
      // Arrange
      const result = err<string, string>('error');

      // Act
      const value = result.unwrapOr('default');

      // Assert
      expect(value).toBe('default');
    });
  });

  describe('unwrapOrElse', () => {
    it('Given: ok result When: unwrapping with function Then: should return value', () => {
      // Arrange
      const result = ok('test');

      // Act
      const value = result.unwrapOrElse(() => 'default');

      // Assert
      expect(value).toBe('test');
    });

    it('Given: err result When: unwrapping with function Then: should return computed value from error', () => {
      // Arrange
      const result = err<string, string>('error');

      // Act
      const value = result.unwrapOrElse(error => `Computed: ${error}`);

      // Assert
      expect(value).toBe('Computed: error');
    });
  });

  describe('match', () => {
    it('Given: ok result When: matching Then: should call onOk callback', () => {
      // Arrange
      const result = ok('test');
      const onOk = jest.fn(value => `Success: ${value}`);
      const onErr = jest.fn(error => `Error: ${error}`);

      // Act
      const matched = result.match(onOk, onErr);

      // Assert
      expect(matched).toBe('Success: test');
      expect(onOk).toHaveBeenCalledWith('test');
      expect(onErr).not.toHaveBeenCalled();
    });

    it('Given: err result When: matching Then: should call onErr callback', () => {
      // Arrange
      const result = err<unknown, string>('error');
      const onOk = jest.fn(value => `Success: ${value}`);
      const onErr = jest.fn(error => `Error: ${error}`);

      // Act
      const matched = result.match(onOk, onErr);

      // Assert
      expect(matched).toBe('Error: error');
      expect(onErr).toHaveBeenCalledWith('error');
      expect(onOk).not.toHaveBeenCalled();
    });
  });

  describe('DomainError types', () => {
    it('Given: ValidationError When: creating Then: should have correct properties', () => {
      // Arrange & Act
      const error = new ValidationError('Validation failed', 'VALIDATION_ERROR', {
        field: 'email',
      });

      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('Given: NotFoundError When: creating Then: should have correct properties', () => {
      // Arrange & Act
      const error = new NotFoundError('Resource not found', 'NOT_FOUND', {
        resourceId: '123',
      });

      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('Given: ConflictError When: creating Then: should have correct properties', () => {
      // Arrange & Act
      const error = new ConflictError('Resource already exists', 'CONFLICT');

      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT');
    });

    it('Given: BusinessRuleError When: creating Then: should have correct properties', () => {
      // Arrange & Act
      const error = new BusinessRuleError('Business rule violated', 'BUSINESS_RULE_VIOLATION');

      // Assert
      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Business rule violated');
      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  describe('Result with DomainError', () => {
    it('Given: ok result with value When: creating Then: should return success', () => {
      // Arrange & Act
      const result = ok<string, DomainError>('test');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('test');
    });

    it('Given: err result with ValidationError When: creating Then: should return error', () => {
      // Arrange
      const error = new ValidationError('Validation failed');

      // Act
      const result = err<string, DomainError>(error);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not be ok'),
        err => {
          expect(err).toBeInstanceOf(ValidationError);
          expect(err.message).toBe('Validation failed');
        }
      );
    });
  });
});
