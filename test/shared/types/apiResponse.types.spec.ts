// API Response Types Tests - Tipos de respuesta de API
// Tests unitarios para los tipos de respuesta siguiendo AAA y Given-When-Then

import type {
  IApiResponse,
  IApiResponseError,
  IApiResponseSuccess,
  IPaginatedResponse,
  IPaginationMeta,
} from '@shared/types/apiResponse.types';

describe('API Response Types', () => {
  describe('IApiResponseSuccess', () => {
    it('Given: valid success response When: creating object Then: should have correct structure', () => {
      // Arrange
      const successResponse: IApiResponseSuccess<{ id: string; name: string }> = {
        success: true,
        message: 'Data retrieved successfully',
        data: { id: '123', name: 'Test' },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(successResponse.success).toBe(true);
      expect(successResponse.message).toBe('Data retrieved successfully');
      expect(successResponse.data).toEqual({ id: '123', name: 'Test' });
      expect(successResponse.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('Given: success response with null data When: creating object Then: should handle null data', () => {
      // Arrange
      const successResponse: IApiResponseSuccess<null> = {
        success: true,
        message: 'No data found',
        data: null,
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeNull();
    });

    it('Given: success response with array data When: creating object Then: should handle array data', () => {
      // Arrange
      const successResponse: IApiResponseSuccess<string[]> = {
        success: true,
        message: 'List retrieved successfully',
        data: ['item1', 'item2', 'item3'],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toEqual(['item1', 'item2', 'item3']);
    });

    it('Given: success response with primitive data When: creating object Then: should handle primitive data', () => {
      // Arrange
      const successResponse: IApiResponseSuccess<number> = {
        success: true,
        message: 'Count retrieved successfully',
        data: 42,
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBe(42);
    });
  });

  describe('IApiResponseError', () => {
    it('Given: valid error response When: creating object Then: should have correct structure', () => {
      // Arrange
      const errorResponse: IApiResponseError = {
        success: false,
        message: 'Validation failed',
        error: {
          statusCode: 400,
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/users',
          method: 'POST',
        },
      };

      // Act & Assert
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.message).toBe('Validation failed');
      expect(errorResponse.error.statusCode).toBe(400);
      expect(errorResponse.error.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(errorResponse.error.path).toBe('/api/users');
      expect(errorResponse.error.method).toBe('POST');
    });

    it('Given: error response with different status codes When: creating object Then: should handle different status codes', () => {
      // Arrange
      const statusCodes = [400, 401, 403, 404, 500];

      // Act & Assert
      statusCodes.forEach(statusCode => {
        const errorResponse: IApiResponseError = {
          success: false,
          message: 'Error occurred',
          error: {
            statusCode,
            timestamp: '2024-01-01T00:00:00.000Z',
            path: '/api/test',
            method: 'GET',
          },
        };

        expect(errorResponse.error.statusCode).toBe(statusCode);
      });
    });

    it('Given: error response with different HTTP methods When: creating object Then: should handle different methods', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      // Act & Assert
      methods.forEach(method => {
        const errorResponse: IApiResponseError = {
          success: false,
          message: 'Error occurred',
          error: {
            statusCode: 500,
            timestamp: '2024-01-01T00:00:00.000Z',
            path: '/api/test',
            method,
          },
        };

        expect(errorResponse.error.method).toBe(method);
      });
    });
  });

  describe('IApiResponse', () => {
    it('Given: success response When: using union type Then: should be valid success response', () => {
      // Arrange
      const response: IApiResponse<{ id: string }> = {
        success: true,
        message: 'Success',
        data: { id: '123' },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({ id: '123' });
      }
    });

    it('Given: error response When: using union type Then: should be valid error response', () => {
      // Arrange
      const response: IApiResponse<{ id: string }> = {
        success: false,
        message: 'Error',
        error: {
          statusCode: 400,
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act & Assert
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.statusCode).toBe(400);
      }
    });
  });

  describe('IPaginationMeta', () => {
    it('Given: valid pagination meta When: creating object Then: should have correct structure', () => {
      // Arrange
      const paginationMeta: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      };

      // Act & Assert
      expect(paginationMeta.page).toBe(1);
      expect(paginationMeta.limit).toBe(10);
      expect(paginationMeta.total).toBe(100);
      expect(paginationMeta.totalPages).toBe(10);
      expect(paginationMeta.hasNext).toBe(true);
      expect(paginationMeta.hasPrev).toBe(false);
    });

    it('Given: pagination meta for first page When: creating object Then: should have correct flags', () => {
      // Arrange
      const paginationMeta: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      };

      // Act & Assert
      expect(paginationMeta.page).toBe(1);
      expect(paginationMeta.hasNext).toBe(true);
      expect(paginationMeta.hasPrev).toBe(false);
    });

    it('Given: pagination meta for middle page When: creating object Then: should have correct flags', () => {
      // Arrange
      const paginationMeta: IPaginationMeta = {
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      };

      // Act & Assert
      expect(paginationMeta.page).toBe(3);
      expect(paginationMeta.hasNext).toBe(true);
      expect(paginationMeta.hasPrev).toBe(true);
    });

    it('Given: pagination meta for last page When: creating object Then: should have correct flags', () => {
      // Arrange
      const paginationMeta: IPaginationMeta = {
        page: 5,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: false,
        hasPrev: true,
      };

      // Act & Assert
      expect(paginationMeta.page).toBe(5);
      expect(paginationMeta.hasNext).toBe(false);
      expect(paginationMeta.hasPrev).toBe(true);
    });

    it('Given: pagination meta for single page When: creating object Then: should have correct flags', () => {
      // Arrange
      const paginationMeta: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      // Act & Assert
      expect(paginationMeta.page).toBe(1);
      expect(paginationMeta.hasNext).toBe(false);
      expect(paginationMeta.hasPrev).toBe(false);
    });
  });

  describe('IPaginatedResponse', () => {
    it('Given: valid paginated response When: creating object Then: should have correct structure', () => {
      // Arrange
      const paginatedResponse: IPaginatedResponse<{ id: string; name: string }> = {
        success: true,
        message: 'Data retrieved successfully',
        data: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(paginatedResponse.success).toBe(true);
      expect(paginatedResponse.data).toHaveLength(2);
      expect(paginatedResponse.pagination.page).toBe(1);
      expect(paginatedResponse.pagination.hasNext).toBe(true);
    });

    it('Given: paginated response with empty data When: creating object Then: should handle empty array', () => {
      // Arrange
      const paginatedResponse: IPaginatedResponse<{ id: string }> = {
        success: true,
        message: 'No data found',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act & Assert
      expect(paginatedResponse.success).toBe(true);
      expect(paginatedResponse.data).toEqual([]);
      expect(paginatedResponse.pagination.total).toBe(0);
    });
  });

  describe('Type compatibility', () => {
    it('Given: success response When: checking type compatibility Then: should be compatible with IApiResponse', () => {
      // Arrange
      const successResponse: IApiResponseSuccess<{ id: string }> = {
        success: true,
        message: 'Success',
        data: { id: '123' },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act
      const response: IApiResponse<{ id: string }> = successResponse;

      // Assert
      expect(response.success).toBe(true);
    });

    it('Given: error response When: checking type compatibility Then: should be compatible with IApiResponse', () => {
      // Arrange
      const errorResponse: IApiResponseError = {
        success: false,
        message: 'Error',
        error: {
          statusCode: 400,
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/test',
          method: 'GET',
        },
      };

      // Act
      const response: IApiResponse<{ id: string }> = errorResponse;

      // Assert
      expect(response.success).toBe(false);
    });

    it('Given: paginated response When: checking type compatibility Then: should be compatible with IApiResponseSuccess', () => {
      // Arrange
      const paginatedResponse: IPaginatedResponse<{ id: string }> = {
        success: true,
        message: 'Success',
        data: [{ id: '123' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Act
      const response: IApiResponseSuccess<{ id: string }[]> = paginatedResponse;

      // Assert
      expect(response.success).toBe(true);
      expect(response.data).toEqual([{ id: '123' }]);
    });
  });
});
