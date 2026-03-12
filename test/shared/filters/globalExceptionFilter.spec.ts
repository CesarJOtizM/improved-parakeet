import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '@shared/filters/globalExceptionFilter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; method: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('Given: HttpException When: catching Then: should return correct status and message', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not Found',
          errorCode: 'UNKNOWN_ERROR',
          error: expect.objectContaining({
            statusCode: HttpStatus.NOT_FOUND,
          }),
        })
      );
    });

    it('Given: HttpException with errorCode When: catching Then: should propagate errorCode', () => {
      const exception = new HttpException(
        { message: 'Product not found', errorCode: 'PRODUCT_NOT_FOUND' },
        HttpStatus.NOT_FOUND
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
        })
      );
    });

    it('Given: HttpException with errorCode and details When: catching Then: should propagate both', () => {
      const exception = new HttpException(
        {
          message: 'Insufficient stock',
          errorCode: 'INSUFFICIENT_STOCK',
          details: {
            productId: 'p1',
            warehouseId: 'w1',
            requestedQuantity: 10,
            availableQuantity: 5,
          },
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'INSUFFICIENT_STOCK',
          error: expect.objectContaining({
            details: {
              productId: 'p1',
              warehouseId: 'w1',
              requestedQuantity: 10,
              availableQuantity: 5,
            },
          }),
        })
      );
    });

    it('Given: HttpException with object response When: catching Then: should extract message', () => {
      const exception = new HttpException(
        { message: 'Custom error message', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });

    it('Given: HttpException with array message When: catching Then: should use first message', () => {
      const exception = new HttpException(
        { message: ['First error', 'Second error'], error: 'Validation Failed' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'First error',
        })
      );
    });

    it('Given: unknown error When: catching Then: should return 500 with INTERNAL_SERVER_ERROR code', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
          errorCode: 'INTERNAL_SERVER_ERROR',
          error: expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          }),
        })
      );
    });

    it('Given: non-error object When: catching Then: should return 500 status', () => {
      const exception = 'String error';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('Given: error When: catching Then: should include request path in response', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/api/test',
            method: 'GET',
          }),
        })
      );
    });

    it('Given: HttpException with string response When: catching Then: should use exception message', () => {
      // HttpException with a simple string response (not object)
      const exception = new HttpException('Simple string error', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Simple string error',
        })
      );
    });

    it('Given: HttpException with object response but no message When: catching Then: should fallback to exception message', () => {
      const exception = new HttpException(
        { error: 'Bad Request', statusCode: 400 },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('Given: HttpException with details as array When: catching Then: should not include details', () => {
      const exception = new HttpException(
        {
          message: 'Validation failed',
          details: ['error1', 'error2'], // array, not object
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
        })
      );
      // details should NOT be in error because it's an array
      const callArgs = mockResponse.json.mock.calls[0]![0] as any;
      expect(callArgs.error.details).toBeUndefined();
    });

    it('Given: HttpException with errorCode as non-string When: catching Then: should use default UNKNOWN_ERROR', () => {
      const exception = new HttpException(
        { message: 'Error', errorCode: 123 }, // number, not string
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'UNKNOWN_ERROR',
        })
      );
    });

    it('Given: null exception When: catching Then: should return 500 with INTERNAL_SERVER_ERROR', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
          errorCode: 'INTERNAL_SERVER_ERROR',
        })
      );
    });

    it('Given: undefined exception When: catching Then: should return 500 with INTERNAL_SERVER_ERROR', () => {
      filter.catch(undefined, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('Given: number exception When: catching Then: should return 500 status', () => {
      filter.catch(42, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('Given: HttpException with null response object When: catching Then: should handle gracefully', () => {
      // Object response but message is null
      const exception = new HttpException(
        { message: null, error: 'Not Found' },
        HttpStatus.NOT_FOUND
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('Given: HttpException with details as null When: catching Then: should not include details', () => {
      const exception = new HttpException(
        {
          message: 'Error',
          details: null,
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      const callArgs = mockResponse.json.mock.calls[0]![0] as any;
      expect(callArgs.error.details).toBeUndefined();
    });

    it('Given: POST request When: catching error Then: should include POST method in response', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/products';
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/api/products',
            method: 'POST',
          }),
        })
      );
    });
  });
});
