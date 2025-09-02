import {
  ApiErrorResponses,
  ApiErrorWrapper,
  ApiResponseWrapper,
  ApiStandardResponses,
  // Swagger decorators
  ApiSuccessResponse,
  // Exception filters
  GlobalExceptionFilter,
  // Message constants
  HTTP_STATUS_MESSAGES,
  IApiResponseError,
  // Response types
  IApiResponseSuccess,
  IPaginatedResponse,
  IPaginationMeta,
  // Interceptors
  ResponseInterceptor,
  calculatePaginationMeta,
  createErrorResponse,
  createPaginatedResponse,
  // Response utilities
  createSuccessResponse,
  getHttpStatusMessage,
} from '@shared/index';

describe('Shared Index Exports', () => {
  describe('Response Types', () => {
    it('Given: IApiResponseSuccess When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const successResponse: IApiResponseSuccess<string> = {
        success: true,
        message: 'Test message',
        data: 'test data',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Assert
      expect(successResponse.success).toBe(true);
      expect(typeof successResponse.message).toBe('string');
      expect(successResponse.data).toBe('test data');
      expect(typeof successResponse.timestamp).toBe('string');
    });

    it('Given: IApiResponseError When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const errorResponse: IApiResponseError = {
        success: false,
        message: 'Error message',
        error: {
          statusCode: 400,
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/test',
          method: 'GET',
        },
      };

      // Assert
      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.message).toBe('string');
      expect(errorResponse.error.statusCode).toBe(400);
      expect(typeof errorResponse.error.timestamp).toBe('string');
      expect(typeof errorResponse.error.path).toBe('string');
      expect(typeof errorResponse.error.method).toBe('string');
    });

    it('Given: IPaginationMeta When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const paginationMeta: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      };

      // Assert
      expect(typeof paginationMeta.page).toBe('number');
      expect(typeof paginationMeta.limit).toBe('number');
      expect(typeof paginationMeta.total).toBe('number');
      expect(typeof paginationMeta.totalPages).toBe('number');
      expect(typeof paginationMeta.hasNext).toBe('boolean');
      expect(typeof paginationMeta.hasPrev).toBe('boolean');
    });

    it('Given: IPaginatedResponse When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const paginatedResponse: IPaginatedResponse<string> = {
        success: true,
        message: 'Data retrieved successfully',
        data: ['item1', 'item2'],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Assert
      expect(paginatedResponse.success).toBe(true);
      expect(Array.isArray(paginatedResponse.data)).toBe(true);
      expect(paginatedResponse.pagination).toBeDefined();
      expect(typeof paginatedResponse.timestamp).toBe('string');
    });
  });

  describe('Response Utilities', () => {
    it('Given: createSuccessResponse When: calling it Then: should return success response', () => {
      // Arrange & Act
      const result = createSuccessResponse('Test message', { id: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test message');
      expect(result.data).toEqual({ id: 1 });
      expect(typeof result.timestamp).toBe('string');
    });

    it('Given: createErrorResponse When: calling it Then: should return error response', () => {
      // Arrange & Act
      const result = createErrorResponse('Error message', 400, '/api/test', 'GET');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Error message');
      expect(result.error.statusCode).toBe(400);
      expect(result.error.path).toBe('/api/test');
      expect(result.error.method).toBe('GET');
      expect(typeof result.error.timestamp).toBe('string');
    });

    it('Given: createPaginatedResponse When: calling it Then: should return paginated response', () => {
      // Arrange & Act
      const paginationMeta: IPaginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      const result = createPaginatedResponse('Data retrieved', ['item1', 'item2'], paginationMeta);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Data retrieved');
      expect(result.data).toEqual(['item1', 'item2']);
      expect(result.pagination).toEqual(paginationMeta);
      expect(typeof result.timestamp).toBe('string');
    });

    it('Given: calculatePaginationMeta When: calling it Then: should return correct meta', () => {
      // Arrange & Act
      const result = calculatePaginationMeta(2, 10, 25);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('Given: calculatePaginationMeta with first page When: calling it Then: should have correct hasPrev', () => {
      // Arrange & Act
      const result = calculatePaginationMeta(1, 10, 25);

      // Assert
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
    });

    it('Given: calculatePaginationMeta with last page When: calling it Then: should have correct hasNext', () => {
      // Arrange & Act
      const result = calculatePaginationMeta(3, 10, 25);

      // Assert
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('Interceptors', () => {
    it('Given: ResponseInterceptor When: checking class Then: should be defined', () => {
      // Assert
      expect(ResponseInterceptor).toBeDefined();
      expect(typeof ResponseInterceptor).toBe('function');
    });
  });

  describe('Exception Filters', () => {
    it('Given: GlobalExceptionFilter When: checking class Then: should be defined', () => {
      // Assert
      expect(GlobalExceptionFilter).toBeDefined();
      expect(typeof GlobalExceptionFilter).toBe('function');
    });
  });

  describe('Swagger Decorators', () => {
    it('Given: ApiSuccessResponse When: checking function Then: should be defined', () => {
      // Assert
      expect(ApiSuccessResponse).toBeDefined();
      expect(typeof ApiSuccessResponse).toBe('function');
    });

    it('Given: ApiErrorResponses When: checking function Then: should be defined', () => {
      // Assert
      expect(ApiErrorResponses).toBeDefined();
      expect(typeof ApiErrorResponses).toBe('function');
    });

    it('Given: ApiStandardResponses When: checking function Then: should be defined', () => {
      // Assert
      expect(ApiStandardResponses).toBeDefined();
      expect(typeof ApiStandardResponses).toBe('function');
    });

    it('Given: ApiResponseWrapper When: checking class Then: should be defined', () => {
      // Assert
      expect(ApiResponseWrapper).toBeDefined();
      expect(typeof ApiResponseWrapper).toBe('function');
    });

    it('Given: ApiErrorWrapper When: checking class Then: should be defined', () => {
      // Assert
      expect(ApiErrorWrapper).toBeDefined();
      expect(typeof ApiErrorWrapper).toBe('function');
    });
  });

  describe('Message Constants', () => {
    it('Given: HTTP_STATUS_MESSAGES When: checking object Then: should have correct structure', () => {
      // Assert
      expect(HTTP_STATUS_MESSAGES).toBeDefined();
      expect(HTTP_STATUS_MESSAGES.SUCCESS).toBeDefined();
      expect(HTTP_STATUS_MESSAGES.VALIDATION).toBeDefined();
      expect(HTTP_STATUS_MESSAGES.BUSINESS).toBeDefined();
      expect(HTTP_STATUS_MESSAGES.SYSTEM).toBeDefined();
    });

    it('Given: getHttpStatusMessage When: calling with valid params Then: should return message', () => {
      // Arrange & Act
      const result = getHttpStatusMessage('SUCCESS', 'CREATED');

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe('Resource created successfully');
    });

    it('Given: getHttpStatusMessage When: calling with invalid params Then: should return fallback', () => {
      // Arrange & Act
      const result = getHttpStatusMessage(
        'INVALID' as keyof typeof HTTP_STATUS_MESSAGES,
        'INVALID_KEY'
      );

      // Assert
      expect(result).toBe('Message not found');
    });
  });
});
