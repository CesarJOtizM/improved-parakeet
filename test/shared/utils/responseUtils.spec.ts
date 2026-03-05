import { describe, expect, it } from '@jest/globals';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  calculatePaginationMeta,
} from '@shared/utils/responseUtils';

describe('responseUtils', () => {
  describe('createSuccessResponse', () => {
    it('Given: message and data When: creating success response Then: should return correct structure', () => {
      // Arrange
      const message = 'Operation successful';
      const data = { id: '123', name: 'Test' };

      // Act
      const result = createSuccessResponse(message, data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
      expect(result.data).toEqual(data);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('Given: array data When: creating success response Then: should return correct structure', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }];

      // Act
      const result = createSuccessResponse('Items retrieved', data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('createErrorResponse', () => {
    it('Given: error details When: creating error response Then: should return correct structure', () => {
      // Arrange
      const message = 'Not found';
      const statusCode = 404;
      const path = '/api/test';
      const method = 'GET';

      // Act
      const result = createErrorResponse(message, statusCode, path, method);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.errorCode).toBe('UNKNOWN_ERROR');
      expect(result.error.statusCode).toBe(statusCode);
      expect(result.error.path).toBe(path);
      expect(result.error.method).toBe(method);
      expect(result.error.timestamp).toBeDefined();
    });

    it('Given: error with errorCode When: creating error response Then: should include errorCode', () => {
      // Act
      const result = createErrorResponse(
        'Product not found',
        404,
        '/products/1',
        'GET',
        'PRODUCT_NOT_FOUND'
      );

      // Assert
      expect(result.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('Given: error with details When: creating error response Then: should include details', () => {
      // Act
      const details = { productId: '123', warehouseId: '456' };
      const result = createErrorResponse(
        'Insufficient stock',
        400,
        '/sales/1/confirm',
        'POST',
        'INSUFFICIENT_STOCK',
        details
      );

      // Assert
      expect(result.errorCode).toBe('INSUFFICIENT_STOCK');
      expect(result.error.details).toEqual(details);
    });

    it('Given: error without details When: creating error response Then: should not include details key', () => {
      // Act
      const result = createErrorResponse('Not found', 404, '/test', 'GET', 'NOT_FOUND');

      // Assert
      expect(result.error.details).toBeUndefined();
    });
  });

  describe('createPaginatedResponse', () => {
    it('Given: data and pagination When: creating paginated response Then: should return correct structure', () => {
      // Arrange
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      };

      // Act
      const result = createPaginatedResponse('Items retrieved', data, pagination);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.pagination).toEqual(pagination);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('calculatePaginationMeta', () => {
    it('Given: first page When: calculating meta Then: should have hasNext but not hasPrev', () => {
      // Act
      const result = calculatePaginationMeta(1, 10, 25);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('Given: last page When: calculating meta Then: should have hasPrev but not hasNext', () => {
      // Act
      const result = calculatePaginationMeta(3, 10, 25);

      // Assert
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('Given: middle page When: calculating meta Then: should have both hasNext and hasPrev', () => {
      // Act
      const result = calculatePaginationMeta(2, 10, 50);

      // Assert
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('Given: single page When: calculating meta Then: should have neither hasNext nor hasPrev', () => {
      // Act
      const result = calculatePaginationMeta(1, 10, 5);

      // Assert
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('Given: empty results When: calculating meta Then: should return zero totalPages', () => {
      // Act
      const result = calculatePaginationMeta(1, 10, 0);

      // Assert
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });
});
