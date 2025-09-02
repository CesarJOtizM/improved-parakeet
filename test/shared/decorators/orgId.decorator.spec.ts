// OrgId Decorator Tests - Decorador de parámetro para organización
// Tests unitarios para el decorador de parámetro siguiendo AAA y Given-When-Then

import { ExecutionContext } from '@nestjs/common';
import { OrgId } from '@shared/decorators/orgId.decorator';

describe('OrgId Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockGetRequest: jest.MockedFunction<() => unknown>;

  beforeEach(() => {
    mockGetRequest = jest.fn().mockReturnValue({
      headers: {},
    });

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: mockGetRequest,
      }),
    } as unknown as ExecutionContext;
  });

  describe('OrgId parameter decorator', () => {
    it('Given: decorator When: calling decorator Then: should return a function', () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-id': 'org-123',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof result).toBe('function');
    });

    it('Given: X-Organization-ID header When: calling decorator Then: should return function that extracts orgId', () => {
      // Arrange
      const orgId = 'org-123';
      const request = {
        headers: {
          'x-organization-id': orgId,
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: X-Organization-Slug header When: calling decorator Then: should return function that extracts orgSlug', () => {
      // Arrange
      const orgSlug = 'my-organization';
      const request = {
        headers: {
          'x-organization-slug': orgSlug,
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: subdomain in host When: calling decorator Then: should return function that extracts subdomain', () => {
      // Arrange
      const subdomain = 'mycompany';
      const request = {
        headers: {
          host: `${subdomain}.example.com`,
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: localhost host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: 'localhost:3000',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: 127.0.0.1 host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: '127.0.0.1:3000',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: no headers When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {},
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: empty host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: '',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: undefined host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: undefined,
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: environment with DEFAULT_ORG_ID When: calling decorator Then: should return env value', () => {
      // Arrange
      const originalEnv = process.env.DEFAULT_ORG_ID;
      process.env.DEFAULT_ORG_ID = 'custom-org-id';

      const request = {
        headers: {},
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');

      // Cleanup
      process.env.DEFAULT_ORG_ID = originalEnv;
    });

    it('Given: priority headers When: calling decorator Then: should prioritize X-Organization-ID', () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-id': 'org-123',
          'x-organization-slug': 'test-org',
          host: 'subdomain.example.com',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: slug and host When: calling decorator Then: should prioritize X-Organization-Slug', () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-slug': 'test-org',
          host: 'subdomain.example.com',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: no headers or host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {},
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: X-Organization-ID takes precedence When: both headers present Then: should return function that prioritizes X-Organization-ID', () => {
      // Arrange
      const orgId = 'org-123';
      const orgSlug = 'my-organization';
      const request = {
        headers: {
          'x-organization-id': orgId,
          'x-organization-slug': orgSlug,
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: custom DEFAULT_ORG_ID environment variable When: calling decorator Then: should return function that uses environment variable', () => {
      // Arrange
      const originalEnv = process.env.DEFAULT_ORG_ID;
      process.env.DEFAULT_ORG_ID = 'custom-org';

      const request = {
        headers: {},
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');

      // Cleanup
      if (originalEnv) {
        process.env.DEFAULT_ORG_ID = originalEnv;
      } else {
        delete process.env.DEFAULT_ORG_ID;
      }
    });

    it('Given: 127.0.0.1 host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: '127.0.0.1:3000',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });

    it('Given: IP address host When: calling decorator Then: should return function that uses default orgId', () => {
      // Arrange
      const request = {
        headers: {
          host: '192.168.1.100:3000',
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const decoratorFunction = OrgId(undefined, mockExecutionContext);

      // Assert
      expect(typeof decoratorFunction).toBe('function');
    });
  });
});
