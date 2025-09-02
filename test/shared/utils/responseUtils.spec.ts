// Response Utils Tests - Funciones de utilidad para respuestas
// Tests unitarios para las funciones puras de utilidad siguiendo AAA y Given-When-Then

import {
  calculatePaginationMeta,
  createErrorResponse,
  createPaginatedResponse,
  createSuccessResponse,
} from '@shared/utils/responseUtils';

import type { IPaginationMeta } from '@shared/types/apiResponse.types';

describe('Response Utils', () => {
  describe('createSuccessResponse', () => {
    it('Given: message and data When: creating success response Then: should return properly formatted success response', () => {
      // Arrange
      const message = 'Operation completed successfully';
      const data = { id: '123', name: 'Test' };

      // Act
      const result = createSuccessResponse(message, data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toEqual(data);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('Given: null data When: creating success response Then: should handle null data correctly', () => {
      // Arrange
      const message = 'No data found';
      const data = null;

      // Act
      const result = createSuccessResponse(message, data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toBeNull();
    });

    it('Given: empty string message When: creating success response Then: should accept empty message', () => {
      // Arrange
      const message = '';
      const data = { test: true };

      // Act
      const result = createSuccessResponse(message, data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('');
      expect(result.data).toEqual(data);
    });
  });

  describe('createErrorResponse', () => {
    it('Given: error details When: creating error response Then: should return properly formatted error response', () => {
      // Arrange
      const message = 'Validation failed';
      const statusCode = 400;
      const path = '/api/users';
      const method = 'POST';

      // Act
      const result = createErrorResponse(message, statusCode, path, method);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.error.statusCode).toBe(statusCode);
      expect(result.error.path).toBe(path);
      expect(result.error.method).toBe(method);
      expect(result.error.timestamp).toBeDefined();
    });

    it('Given: different HTTP methods When: creating error response Then: should handle all HTTP methods', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      // Act & Assert
      methods.forEach(method => {
        const result = createErrorResponse('Error', 500, '/test', method);
        expect(result.error.method).toBe(method);
      });
    });

    it('Given: different status codes When: creating error response Then: should handle all status codes', () => {
      // Arrange
      const statusCodes = [400, 401, 403, 404, 500];

      // Act & Assert
      statusCodes.forEach(statusCode => {
        const result = createErrorResponse('Error', statusCode, '/test', 'GET');
        expect(result.error.statusCode).toBe(statusCode);
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('Given: paginated data and meta When: creating paginated response Then: should return properly formatted paginated response', () => {
      // Arrange
      const message = 'Data retrieved successfully';
      const data = [{ id: '1' }, { id: '2' }];
      const pagination: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      };

      // Act
      const result = createPaginatedResponse(message, data, pagination);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toEqual(data);
      expect(result.pagination).toEqual(pagination);
      expect(result.timestamp).toBeDefined();
    });

    it('Given: empty data array When: creating paginated response Then: should handle empty array', () => {
      // Arrange
      const message = 'No results found';
      const data: unknown[] = [];
      const pagination: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };

      // Act
      const result = createPaginatedResponse(message, data, pagination);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('calculatePaginationMeta', () => {
    it('Given: page 1, limit 10, total 25 When: calculating pagination meta Then: should return correct pagination metadata', () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const total = 25;

      // Act
      const result = calculatePaginationMeta(page, limit, total);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('Given: page 2, limit 5, total 10 When: calculating pagination meta Then: should return correct middle page metadata', () => {
      // Arrange
      const page = 2;
      const limit = 5;
      const total = 10;

      // Act
      const result = calculatePaginationMeta(page, limit, total);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('Given: page 1, limit 10, total 0 When: calculating pagination meta Then: should handle empty results', () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const total = 0;

      // Act
      const result = calculatePaginationMeta(page, limit, total);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('Given: exact division When: calculating pagination meta Then: should handle exact page count', () => {
      // Arrange
      const page = 2;
      const limit = 5;
      const total = 10; // Exactly 2 pages

      // Act
      const result = calculatePaginationMeta(page, limit, total);

      // Assert
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false); // Last page
      expect(result.hasPrev).toBe(true); // Not first page
    });

    it('Given: single page results When: calculating pagination meta Then: should handle single page', () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const total = 5; // Less than limit

      // Act
      const result = calculatePaginationMeta(page, limit, total);

      // Assert
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });
});
