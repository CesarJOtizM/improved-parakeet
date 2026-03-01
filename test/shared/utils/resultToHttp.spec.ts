import { describe, expect, it } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthenticationError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
  RateLimitError,
  TokenError,
  ValidationError,
} from '@shared/domain/result/domainError';
import { ok } from '@shared/domain/result/ok';
import { err } from '@shared/domain/result/err';
import { domainErrorToHttpException, resultToHttpResponse } from '@shared/utils/resultToHttp';

describe('resultToHttp', () => {
  describe('domainErrorToHttpException', () => {
    it('Given: NotFoundError When: converting to HTTP exception Then: should throw NotFoundException with 404', () => {
      // Arrange
      const error = new NotFoundError('Product not found');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(NotFoundException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as NotFoundException).message).toBe('Product not found');
        expect((e as NotFoundException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('Given: ValidationError When: converting to HTTP exception Then: should throw BadRequestException with 400', () => {
      // Arrange
      const error = new ValidationError('Invalid email format');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(BadRequestException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Invalid email format');
        expect((e as BadRequestException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('Given: BusinessRuleError When: converting to HTTP exception Then: should throw BadRequestException with 400', () => {
      // Arrange
      const error = new BusinessRuleError('Cannot delete active product');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(BadRequestException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Cannot delete active product');
        expect((e as BadRequestException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('Given: AuthenticationError When: converting to HTTP exception Then: should throw UnauthorizedException with 401', () => {
      // Arrange
      const error = new AuthenticationError('wrong password');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(UnauthorizedException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as UnauthorizedException).message).toBe('Authentication failed');
        expect((e as UnauthorizedException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it('Given: TokenError When: converting to HTTP exception Then: should throw UnauthorizedException with 401', () => {
      // Arrange
      const error = new TokenError('token expired');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(UnauthorizedException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as UnauthorizedException).message).toBe('Invalid or expired token');
        expect((e as UnauthorizedException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it('Given: ConflictError When: converting to HTTP exception Then: should throw ConflictException with 409', () => {
      // Arrange
      const error = new ConflictError('SKU already exists');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(ConflictException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as ConflictException).message).toBe('SKU already exists');
        expect((e as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('Given: RateLimitError When: converting to HTTP exception Then: should throw HttpException with 429', () => {
      // Arrange
      const error = new RateLimitError();

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(HttpException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).message).toBe('Too many requests. Please try again later.');
        expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('Given: RateLimitError with custom message When: converting Then: should use the custom message', () => {
      // Arrange
      const error = new RateLimitError('Rate limit exceeded for login');

      // Act & Assert
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect((e as HttpException).message).toBe('Rate limit exceeded for login');
        expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('Given: unknown DomainError subclass When: converting to HTTP exception Then: should default to BadRequestException', () => {
      // Arrange - create a concrete subclass that doesn't match any specific error type
      class UnknownDomainError extends DomainError {
        constructor(message: string) {
          super(message, 'UNKNOWN');
        }
      }
      const error = new UnknownDomainError('Something went wrong');

      // Act & Assert
      expect(() => domainErrorToHttpException(error)).toThrow(BadRequestException);
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Something went wrong');
      }
    });

    it('Given: AuthenticationError without internal reason When: converting Then: should still use generic message', () => {
      // Arrange
      const error = new AuthenticationError();

      // Act & Assert
      try {
        domainErrorToHttpException(error);
      } catch (e) {
        expect((e as UnauthorizedException).message).toBe('Authentication failed');
      }
    });
  });

  describe('resultToHttpResponse', () => {
    it('Given: ok result with value When: converting to HTTP response Then: should return the value', () => {
      // Arrange
      const result = ok({ id: '123', name: 'Test Product' });

      // Act
      const response = resultToHttpResponse(result);

      // Assert
      expect(response).toEqual({ id: '123', name: 'Test Product' });
    });

    it('Given: ok result with null When: converting to HTTP response Then: should return null', () => {
      // Arrange
      const result = ok(null);

      // Act
      const response = resultToHttpResponse(result);

      // Assert
      expect(response).toBeNull();
    });

    it('Given: err result with NotFoundError When: converting to HTTP response Then: should throw NotFoundException', () => {
      // Arrange
      const result = err(new NotFoundError('User not found'));

      // Act & Assert
      expect(() => resultToHttpResponse(result)).toThrow(NotFoundException);
    });

    it('Given: err result with ValidationError When: converting to HTTP response Then: should throw BadRequestException', () => {
      // Arrange
      const result = err(new ValidationError('Email is required'));

      // Act & Assert
      expect(() => resultToHttpResponse(result)).toThrow(BadRequestException);
    });

    it('Given: err result with AuthenticationError When: converting to HTTP response Then: should throw UnauthorizedException', () => {
      // Arrange
      const result = err(new AuthenticationError('invalid credentials'));

      // Act & Assert
      expect(() => resultToHttpResponse(result)).toThrow(UnauthorizedException);
    });

    it('Given: ok result with array When: converting to HTTP response Then: should return the array', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = ok(data);

      // Act
      const response = resultToHttpResponse(result);

      // Assert
      expect(response).toEqual(data);
      expect(response).toHaveLength(3);
    });
  });
});
