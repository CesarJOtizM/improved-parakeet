// Global Exception Filter Tests - Filtro de excepciones global
// Tests unitarios para el filtro de excepciones siguiendo AAA y Given-When-Then

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '@shared/filters/globalExceptionFilter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('Given: HttpException When: catching exception Then: should return formatted error response', () => {
      // Arrange
      const httpException = new HttpException('Validation failed', HttpStatus.BAD_REQUEST);
      const expectedErrorResponse = {
        success: false,
        message: 'Validation failed',
        error: {
          statusCode: 400,
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it('Given: HttpException with object response When: catching exception Then: should extract message from object', () => {
      // Arrange
      const httpException = new HttpException(
        { message: 'Custom error message', errors: ['field1', 'field2'] },
        HttpStatus.BAD_REQUEST
      );

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });

    it('Given: HttpException with array message When: catching exception Then: should extract first message from array', () => {
      // Arrange
      const httpException = new HttpException(
        { message: ['First error', 'Second error'] },
        HttpStatus.BAD_REQUEST
      );

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'First error',
        })
      );
    });

    it('Given: HttpException with empty object response When: catching exception Then: should use exception message', () => {
      // Arrange
      const httpException = new HttpException({}, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Http Exception',
        })
      );
    });

    it('Given: non-HttpException When: catching exception Then: should return internal server error', () => {
      // Arrange
      const genericError = new Error('Database connection failed');
      const expectedErrorResponse = {
        success: false,
        message: 'Internal server error',
        error: {
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act
      filter.catch(genericError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it('Given: string error When: catching exception Then: should return internal server error', () => {
      // Arrange
      const stringError = 'Unexpected error occurred';
      const expectedErrorResponse = {
        success: false,
        message: 'Internal server error',
        error: {
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act
      filter.catch(stringError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it('Given: null error When: catching exception Then: should return internal server error', () => {
      // Arrange
      const nullError = null;
      const expectedErrorResponse = {
        success: false,
        message: 'Internal server error',
        error: {
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act
      filter.catch(nullError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedErrorResponse);
    });

    it('Given: different HTTP status codes When: catching exceptions Then: should return correct status codes', () => {
      // Arrange
      const statusCodes = [400, 401, 403, 404, 409, 422, 500];

      // Act & Assert
      statusCodes.forEach(statusCode => {
        const httpException = new HttpException('Error', statusCode);
        filter.catch(httpException, mockArgumentsHost);
        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
      });
    });

    it('Given: different HTTP methods When: catching exceptions Then: should include correct method in error', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach(method => {
        mockRequest.method = method;
        const httpException = new HttpException('Error', HttpStatus.BAD_REQUEST);

        // Act
        filter.catch(httpException, mockArgumentsHost);

        // Assert
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              method,
            }),
          })
        );
      });
    });

    it('Given: different request URLs When: catching exceptions Then: should include correct path in error', () => {
      // Arrange
      const urls = ['/api/users', '/api/products', '/api/warehouses'];

      urls.forEach(url => {
        mockRequest.url = url;
        const httpException = new HttpException('Error', HttpStatus.BAD_REQUEST);

        // Act
        filter.catch(httpException, mockArgumentsHost);

        // Assert
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              path: url,
            }),
          })
        );
      });
    });

    it('Given: HttpException with null response When: catching exception Then: should use exception message', () => {
      // Arrange
      const httpException = new HttpException(null, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Http Exception',
        })
      );
    });

    it('Given: HttpException with undefined response When: catching exception Then: should use exception message', () => {
      // Arrange
      const httpException = new HttpException(undefined, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Http Exception',
        })
      );
    });

    it('Given: error with stack trace When: catching exception Then: should log error for debugging', () => {
      // Arrange
      const errorWithStack = new Error('Database error');
      errorWithStack.stack = 'Error: Database error\n    at test.js:1:1';

      // Mock logger.error to verify logging
      const loggerSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();

      // Act
      filter.catch(errorWithStack, mockArgumentsHost);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Error 500: Internal server error - GET /api/test');

      // Cleanup
      loggerSpy.mockRestore();
    });
  });
});
