import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '@shared/filters/globalExceptionFilter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
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
      // Arrange
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not Found',
          error: expect.objectContaining({
            statusCode: HttpStatus.NOT_FOUND,
          }),
        })
      );
    });

    it('Given: HttpException with object response When: catching Then: should extract message', () => {
      // Arrange
      const exception = new HttpException(
        { message: 'Custom error message', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });

    it('Given: HttpException with array message When: catching Then: should use first message', () => {
      // Arrange
      const exception = new HttpException(
        { message: ['First error', 'Second error'], error: 'Validation Failed' },
        HttpStatus.BAD_REQUEST
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'First error',
        })
      );
    });

    it('Given: unknown error When: catching Then: should return 500 status', () => {
      // Arrange
      const exception = new Error('Unexpected error');

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
          error: expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          }),
        })
      );
    });

    it('Given: non-error object When: catching Then: should return 500 status', () => {
      // Arrange
      const exception = 'String error';

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('Given: error When: catching Then: should include request path in response', () => {
      // Arrange
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockHost);

      // Assert
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
