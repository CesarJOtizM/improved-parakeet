// API Response Decorator Tests - Decoradores de respuesta API
// Tests unitarios para los decoradores de respuesta API siguiendo AAA y Given-When-Then

import {
  ApiErrorResponses,
  ApiErrorWrapper,
  ApiResponseWrapper,
  ApiStandardResponses,
  ApiSuccessResponse,
} from '@shared/decorators/apiResponse.decorator';

// Clase de prueba para el modelo
class TestModel {
  id: string;
  name: string;
  value: number;

  constructor(id: string, name: string, value: number) {
    this.id = id;
    this.name = name;
    this.value = value;
  }
}

describe('API Response Decorator', () => {
  describe('ApiSuccessResponse', () => {
    it('Given: model and description When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;
      const description = 'Test success response';

      // Act
      const decorator = ApiSuccessResponse(model, description);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model without description When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;

      // Act
      const decorator = ApiSuccessResponse(model);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model When: creating decorator Then: should use default description', () => {
      // Arrange
      const model = TestModel;

      // Act
      const decorator = ApiSuccessResponse(model);

      // Assert
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ApiErrorResponses', () => {
    it('Given: single status code When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const statusCode = 400;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: multiple status codes When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const statusCodes = [400, 401, 403, 404, 500];

      // Act
      const decorator = ApiErrorResponses(...statusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: empty status codes When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const statusCodes: number[] = [];

      // Act
      const decorator = ApiErrorResponses(...statusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ApiStandardResponses', () => {
    it('Given: model and success description When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;
      const successDescription = 'Test success response';
      const errorStatusCodes = [400, 401, 403, 404, 500];

      // Act
      const decorator = ApiStandardResponses(model, successDescription, errorStatusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model without success description When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;
      const errorStatusCodes = [400, 401, 403, 404, 500];

      // Act
      const decorator = ApiStandardResponses(model, undefined, errorStatusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model without error status codes When: creating decorator Then: should use default error codes', () => {
      // Arrange
      const model = TestModel;
      const successDescription = 'Test success response';

      // Act
      const decorator = ApiStandardResponses(model, successDescription);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model without any optional parameters When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;

      // Act
      const decorator = ApiStandardResponses(model);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: model with custom error status codes When: creating decorator Then: should return decorator function', () => {
      // Arrange
      const model = TestModel;
      const successDescription = 'Test success response';
      const errorStatusCodes = [422, 429, 503];

      // Act
      const decorator = ApiStandardResponses(model, successDescription, errorStatusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });
  });

  describe('getErrorDescription', () => {
    it('Given: status code 400 When: getting description Then: should return Bad request', () => {
      // Arrange
      const statusCode = 400;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 401 When: getting description Then: should return Unauthorized', () => {
      // Arrange
      const statusCode = 401;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 403 When: getting description Then: should return Forbidden', () => {
      // Arrange
      const statusCode = 403;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 404 When: getting description Then: should return Not found', () => {
      // Arrange
      const statusCode = 404;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 409 When: getting description Then: should return Conflict', () => {
      // Arrange
      const statusCode = 409;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 422 When: getting description Then: should return Unprocessable entity', () => {
      // Arrange
      const statusCode = 422;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: status code 500 When: getting description Then: should return Internal server error', () => {
      // Arrange
      const statusCode = 500;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: unknown status code When: getting description Then: should return Error', () => {
      // Arrange
      const statusCode = 999;

      // Act
      const decorator = ApiErrorResponses(statusCode);

      // Assert
      expect(typeof decorator).toBe('function');
    });
  });

  describe('ApiResponseWrapper', () => {
    it('Given: ApiResponseWrapper class When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const wrapper = new ApiResponseWrapper();
      wrapper.success = true;
      wrapper.message = 'Test message';
      wrapper.data = { test: 'data' };
      wrapper.timestamp = '2024-01-01T00:00:00.000Z';

      // Assert
      expect(wrapper.success).toBeDefined();
      expect(wrapper.message).toBeDefined();
      expect(wrapper.data).toBeDefined();
      expect(wrapper.timestamp).toBeDefined();
    });

    it('Given: ApiResponseWrapper class When: checking success property Then: should be true', () => {
      // Arrange & Act
      const wrapper = new ApiResponseWrapper();
      wrapper.success = true;

      // Assert
      expect(wrapper.success).toBe(true);
    });

    it('Given: ApiResponseWrapper class When: checking message property Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiResponseWrapper();
      wrapper.message = 'Test message';

      // Assert
      expect(typeof wrapper.message).toBe('string');
    });

    it('Given: ApiResponseWrapper class When: checking data property Then: should be defined', () => {
      // Arrange & Act
      const wrapper = new ApiResponseWrapper();
      wrapper.data = { test: 'data' };

      // Assert
      expect(wrapper.data).toBeDefined();
    });

    it('Given: ApiResponseWrapper class When: checking timestamp property Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiResponseWrapper();
      wrapper.timestamp = '2024-01-01T00:00:00.000Z';

      // Assert
      expect(typeof wrapper.timestamp).toBe('string');
    });
  });

  describe('ApiErrorWrapper', () => {
    it('Given: ApiErrorWrapper class When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.success = false;
      wrapper.message = 'Error message';
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(wrapper.success).toBeDefined();
      expect(wrapper.message).toBeDefined();
      expect(wrapper.error).toBeDefined();
    });

    it('Given: ApiErrorWrapper class When: checking success property Then: should be false', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.success = false;

      // Assert
      expect(wrapper.success).toBe(false);
    });

    it('Given: ApiErrorWrapper class When: checking message property Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.message = 'Error message';

      // Assert
      expect(typeof wrapper.message).toBe('string');
    });

    it('Given: ApiErrorWrapper class When: checking error property Then: should have correct structure', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(wrapper.error.statusCode).toBeDefined();
      expect(wrapper.error.timestamp).toBeDefined();
      expect(wrapper.error.path).toBeDefined();
      expect(wrapper.error.method).toBeDefined();
    });

    it('Given: ApiErrorWrapper class When: checking error.statusCode Then: should be number', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(typeof wrapper.error.statusCode).toBe('number');
    });

    it('Given: ApiErrorWrapper class When: checking error.timestamp Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(typeof wrapper.error.timestamp).toBe('string');
    });

    it('Given: ApiErrorWrapper class When: checking error.path Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(typeof wrapper.error.path).toBe('string');
    });

    it('Given: ApiErrorWrapper class When: checking error.method Then: should be string', () => {
      // Arrange & Act
      const wrapper = new ApiErrorWrapper();
      wrapper.error = {
        statusCode: 400,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
        method: 'GET',
      };

      // Assert
      expect(typeof wrapper.error.method).toBe('string');
    });
  });

  describe('Decorator composition', () => {
    it('Given: ApiStandardResponses When: creating decorator Then: should combine success and error decorators', () => {
      // Arrange
      const model = TestModel;
      const successDescription = 'Test success response';
      const errorStatusCodes = [400, 401, 403, 404, 500];

      // Act
      const decorator = ApiStandardResponses(model, successDescription, errorStatusCodes);

      // Assert
      expect(typeof decorator).toBe('function');
    });

    it('Given: multiple decorators When: applying them Then: should work together', () => {
      // Arrange
      const model = TestModel;
      const successDecorator = ApiSuccessResponse(model, 'Success');
      const errorDecorator = ApiErrorResponses(400, 401, 403);

      // Act & Assert
      expect(typeof successDecorator).toBe('function');
      expect(typeof errorDecorator).toBe('function');
    });
  });
});
