import { describe, expect, it } from '@jest/globals';
import { HttpException, HttpStatus } from '@nestjs/common';
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
    it('Given: NotFoundError When: converting Then: should throw HttpException with 404 and errorCode', () => {
      const error = new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND', {
        productId: '123',
      });

      try {
        domainErrorToHttpException(error);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.NOT_FOUND);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Product not found');
        expect(body.errorCode).toBe('PRODUCT_NOT_FOUND');
        expect(body.details).toEqual({ productId: '123' });
      }
    });

    it('Given: NotFoundError without code When: converting Then: should use default code NOT_FOUND', () => {
      const error = new NotFoundError('Item not found');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const body = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(body.errorCode).toBe('NOT_FOUND');
      }
    });

    it('Given: ValidationError When: converting Then: should throw HttpException with 400', () => {
      const error = new ValidationError('Invalid email format', 'USER_VALIDATION_FAILED');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Invalid email format');
        expect(body.errorCode).toBe('USER_VALIDATION_FAILED');
      }
    });

    it('Given: BusinessRuleError When: converting Then: should throw HttpException with 400', () => {
      const error = new BusinessRuleError('Cannot delete active product', 'CATEGORY_HAS_PRODUCTS');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.errorCode).toBe('CATEGORY_HAS_PRODUCTS');
      }
    });

    it('Given: AuthenticationError When: converting Then: should throw HttpException with 401 and AUTHENTICATION_ERROR code', () => {
      const error = new AuthenticationError('wrong password');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Authentication failed');
        expect(body.errorCode).toBe('AUTHENTICATION_ERROR');
      }
    });

    it('Given: TokenError When: converting Then: should throw HttpException with 401 and TOKEN_ERROR code', () => {
      const error = new TokenError('token expired');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Invalid or expired token');
        expect(body.errorCode).toBe('TOKEN_ERROR');
      }
    });

    it('Given: ConflictError When: converting Then: should throw HttpException with 409', () => {
      const error = new ConflictError('SKU already exists', 'PRODUCT_SKU_CONFLICT');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.CONFLICT);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.errorCode).toBe('PRODUCT_SKU_CONFLICT');
      }
    });

    it('Given: RateLimitError When: converting Then: should throw HttpException with 429', () => {
      const error = new RateLimitError();

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Too many requests. Please try again later.');
        expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      }
    });

    it('Given: RateLimitError with custom message When: converting Then: should use custom message', () => {
      const error = new RateLimitError('Rate limit exceeded for login');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const body = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(body.message).toBe('Rate limit exceeded for login');
      }
    });

    it('Given: unknown DomainError subclass When: converting Then: should default to 400 with UNKNOWN_ERROR', () => {
      class UnknownDomainError extends DomainError {
        constructor(message: string) {
          super(message);
        }
      }
      const error = new UnknownDomainError('Something went wrong');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const exc = e as HttpException;
        expect(exc.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body.errorCode).toBe('UNKNOWN_ERROR');
      }
    });

    it('Given: error without details When: converting Then: details should be undefined', () => {
      const error = new NotFoundError('Not found');

      try {
        domainErrorToHttpException(error);
      } catch (e) {
        const body = (e as HttpException).getResponse() as Record<string, unknown>;
        expect(body.details).toBeUndefined();
      }
    });
  });

  describe('resultToHttpResponse', () => {
    it('Given: ok result with value When: converting Then: should return the value', () => {
      const result = ok({ id: '123', name: 'Test Product' });
      const response = resultToHttpResponse(result);
      expect(response).toEqual({ id: '123', name: 'Test Product' });
    });

    it('Given: ok result with null When: converting Then: should return null', () => {
      const result = ok(null);
      const response = resultToHttpResponse(result);
      expect(response).toBeNull();
    });

    it('Given: err result with NotFoundError When: converting Then: should throw HttpException with 404', () => {
      const result = err(new NotFoundError('User not found'));
      expect(() => resultToHttpResponse(result)).toThrow(HttpException);
      try {
        resultToHttpResponse(result);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('Given: err result with ValidationError When: converting Then: should throw HttpException with 400', () => {
      const result = err(new ValidationError('Email is required'));
      expect(() => resultToHttpResponse(result)).toThrow(HttpException);
      try {
        resultToHttpResponse(result);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('Given: err result with AuthenticationError When: converting Then: should throw HttpException with 401', () => {
      const result = err(new AuthenticationError('invalid credentials'));
      expect(() => resultToHttpResponse(result)).toThrow(HttpException);
      try {
        resultToHttpResponse(result);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it('Given: ok result with array When: converting Then: should return the array', () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = ok(data);
      const response = resultToHttpResponse(result);
      expect(response).toEqual(data);
      expect(response).toHaveLength(3);
    });
  });
});
