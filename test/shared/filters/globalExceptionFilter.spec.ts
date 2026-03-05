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
  });
});
