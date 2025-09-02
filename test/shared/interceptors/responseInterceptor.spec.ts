// Response Interceptor Tests - Interceptor de respuesta
// Tests unitarios para el interceptor de respuesta siguiendo AAA y Given-When-Then

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ResponseInterceptor } from '@shared/interceptors/responseInterceptor';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/api/test',
        }),
      }),
    } as unknown as ExecutionContext;
  });

  describe('intercept', () => {
    it('Given: successful response with data When: intercepting Then: should wrap response in success format', done => {
      // Arrange
      const responseData = { id: '123', name: 'Test' };
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: responseData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('Given: successful response with null data When: intercepting Then: should wrap null response correctly', done => {
      // Arrange
      const responseData = null;
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Operation completed successfully',
          data: null,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('Given: successful response with undefined data When: intercepting Then: should wrap undefined response correctly', done => {
      // Arrange
      const responseData = undefined;
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Operation completed successfully',
          data: null, // undefined gets converted to null
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('Given: response already in correct format When: intercepting Then: should return response as is', done => {
      // Arrange
      const responseData = {
        success: true,
        message: 'Custom message',
        data: { id: '123' },
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual(responseData);
        done();
      });
    });

    it('Given: POST request When: intercepting Then: should use correct default message', done => {
      // Arrange
      const responseData = { id: '123' };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        method: 'POST',
        url: '/api/test',
      });
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result.message).toBe('Resource created successfully');
        done();
      });
    });

    it('Given: PUT request When: intercepting Then: should use correct default message', done => {
      // Arrange
      const responseData = { id: '123' };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        method: 'PUT',
        url: '/api/test',
      });
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result.message).toBe('Resource updated successfully');
        done();
      });
    });

    it('Given: PATCH request When: intercepting Then: should use correct default message', done => {
      // Arrange
      const responseData = { id: '123' };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        method: 'PATCH',
        url: '/api/test',
      });
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result.message).toBe('Resource partially updated successfully');
        done();
      });
    });

    it('Given: DELETE request When: intercepting Then: should use correct default message', done => {
      // Arrange
      const responseData = { id: '123' };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        method: 'DELETE',
        url: '/api/test',
      });
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result.message).toBe('Resource deleted successfully');
        done();
      });
    });

    it('Given: unknown HTTP method When: intercepting Then: should use generic message', done => {
      // Arrange
      const responseData = { id: '123' };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        method: 'OPTIONS',
        url: '/api/test',
      });
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result.message).toBe('Operation completed successfully');
        done();
      });
    });

    it('Given: empty array response When: intercepting Then: should wrap array correctly', done => {
      // Arrange
      const responseData: unknown[] = [];
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: [],
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('Given: string response When: intercepting Then: should wrap string correctly', done => {
      // Arrange
      const responseData = 'Success message';
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: 'Success message',
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('Given: number response When: intercepting Then: should wrap number correctly', done => {
      // Arrange
      const responseData = 42;
      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      };

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(result => {
        expect(result).toEqual({
          success: true,
          message: 'Data retrieved successfully',
          data: 42,
          timestamp: expect.any(String),
        });
        done();
      });
    });
  });

  describe('generateDefaultMessage', () => {
    it('Given: GET method When: generating message Then: should return correct message', () => {
      // Arrange
      const method = 'GET';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Data retrieved successfully');
    });

    it('Given: POST method When: generating message Then: should return correct message', () => {
      // Arrange
      const method = 'POST';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Resource created successfully');
    });

    it('Given: PUT method When: generating message Then: should return correct message', () => {
      // Arrange
      const method = 'PUT';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Resource updated successfully');
    });

    it('Given: PATCH method When: generating message Then: should return correct message', () => {
      // Arrange
      const method = 'PATCH';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Resource partially updated successfully');
    });

    it('Given: DELETE method When: generating message Then: should return correct message', () => {
      // Arrange
      const method = 'DELETE';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Resource deleted successfully');
    });

    it('Given: unknown method When: generating message Then: should return generic message', () => {
      // Arrange
      const method = 'OPTIONS';

      // Act
      const result = (
        interceptor as { generateDefaultMessage(method: string, path: string): string }
      ).generateDefaultMessage(method, '/test');

      // Assert
      expect(result).toBe('Operation completed successfully');
    });
  });
});
