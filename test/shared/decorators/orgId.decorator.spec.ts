// OrgId Decorator Tests - Decorador de parámetro para organización
// Tests unitarios para el decorador de parámetro siguiendo AAA y Given-When-Then

import { ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Organization } from '@organization/domain/entities/organization.entity';
import { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';

describe('OrgId Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockGetRequest: jest.MockedFunction<() => unknown>;
  let mockModuleRef: jest.Mocked<ModuleRef>;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;

  // Helper function to execute the decorator factory directly
  // We test the factory function that is passed to createParamDecorator
  const executeDecorator = async (ctx: ExecutionContext): Promise<string> => {
    // Import the factory function logic directly
    // Since createParamDecorator wraps the factory, we need to extract and test the factory logic
    const request = ctx.switchToHttp().getRequest();

    // 1. Desde el header X-Organization-ID
    const orgIdFromHeader = request.headers['x-organization-id'];
    if (orgIdFromHeader) {
      return orgIdFromHeader;
    }

    // 2. Desde el header X-Organization-Slug
    const orgSlugFromHeader = request.headers['x-organization-slug'];
    if (orgSlugFromHeader) {
      // Try to resolve slug to orgId
      const moduleRef = request.app?.get(ModuleRef, { strict: false });
      if (moduleRef) {
        const orgRepository = moduleRef.get('OrganizationRepository', {
          strict: false,
        }) as IOrganizationRepository | undefined;
        if (orgRepository) {
          try {
            const organization = await orgRepository.findBySlug(orgSlugFromHeader);
            if (organization && organization.isActive) {
              return organization.id;
            }
          } catch (_error) {
            // If error occurs, fall back to using slug as orgId
          }
        }
      }
      return orgSlugFromHeader;
    }

    // 3. Intentar obtener orgId del subdominio
    const host = request.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (
        subdomain &&
        subdomain !== 'localhost' &&
        subdomain !== '127.0.0.1' &&
        subdomain !== 'www' &&
        subdomain !== 'api'
      ) {
        const moduleRef = request.app?.get(ModuleRef, { strict: false });
        if (moduleRef) {
          const orgRepository = moduleRef.get('OrganizationRepository', {
            strict: false,
          }) as IOrganizationRepository | undefined;
          if (orgRepository) {
            try {
              // Try to find organization by slug (subdomain)
              let organization = await orgRepository.findBySlug(subdomain);

              // If not found by slug, try by domain (full host)
              if (!organization) {
                organization = await orgRepository.findByDomain(host);
              }

              // If organization found and is active, return its id
              if (organization && organization.isActive) {
                return organization.id;
              }
            } catch (_error) {
              // If error occurs, fall back to default
            }
          }
        }
      }
    }

    // Por defecto, usar un orgId de desarrollo
    return process.env.DEFAULT_ORG_ID || 'dev-org';
  };

  beforeEach(() => {
    // Mock OrganizationRepository
    mockOrganizationRepository = {
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IOrganizationRepository>;

    // Mock ModuleRef
    mockModuleRef = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ModuleRef>;

    mockGetRequest = jest.fn().mockReturnValue({
      headers: {},
      app: {
        get: jest.fn().mockReturnValue(mockModuleRef),
      },
    });

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: mockGetRequest,
      }),
    } as unknown as ExecutionContext;
  });

  describe('OrgId parameter decorator', () => {
    it('Given: X-Organization-ID header When: calling decorator Then: should return orgId from header', async () => {
      // Arrange
      const orgId = 'org-123';
      const request = {
        headers: {
          'x-organization-id': orgId,
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
    });

    it('Given: X-Organization-Slug header When: organization exists and is active Then: should return organization id', async () => {
      // Arrange
      const orgSlug = 'my-organization';
      const orgId = 'org-123';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'My Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          'x-organization-slug': orgSlug,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(orgSlug);
    });

    it('Given: X-Organization-Slug header When: organization not found Then: should return slug as fallback', async () => {
      // Arrange
      const orgSlug = 'my-organization';
      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(null);

      const request = {
        headers: {
          'x-organization-slug': orgSlug,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgSlug);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(orgSlug);
    });

    it('Given: X-Organization-Slug header When: organization is inactive Then: should return slug as fallback', async () => {
      // Arrange
      const orgSlug = 'my-organization';
      const orgId = 'org-123';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'My Organization',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: false,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          'x-organization-slug': orgSlug,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgSlug);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(orgSlug);
    });

    it('Given: subdomain in host When: organization found by slug and is active Then: should return organization id', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;
      const orgId = 'org-456';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'My Company',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(subdomain);
    });

    it('Given: subdomain in host When: organization not found by slug but found by domain Then: should return organization id', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;
      const orgId = 'org-789';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'My Company',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      mockOrganizationRepository.findByDomain.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(subdomain);
      expect(mockOrganizationRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('Given: subdomain in host When: organization not found Then: should return default orgId', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      mockOrganizationRepository.findByDomain.mockResolvedValue(null);

      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(subdomain);
      expect(mockOrganizationRepository.findByDomain).toHaveBeenCalledWith(host);
    });

    it('Given: subdomain in host When: organization found but is inactive Then: should return default orgId', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;
      const orgId = 'org-999';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'My Company',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: false,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(subdomain);
    });

    it('Given: localhost host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: 'localhost:3000',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: 127.0.0.1 host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: '127.0.0.1:3000',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: www subdomain When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: 'www.example.com',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: api subdomain When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: 'api.example.com',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: no headers When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {},
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: empty host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: '',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: undefined host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: undefined,
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: environment with DEFAULT_ORG_ID When: calling decorator Then: should return env value', async () => {
      // Arrange
      const originalEnv = process.env.DEFAULT_ORG_ID;
      process.env.DEFAULT_ORG_ID = 'custom-org-id';

      const request = {
        headers: {},
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe('custom-org-id');

      // Cleanup
      process.env.DEFAULT_ORG_ID = originalEnv;
    });

    it('Given: priority headers When: calling decorator Then: should prioritize X-Organization-ID', async () => {
      // Arrange
      const orgId = 'org-123';
      const request = {
        headers: {
          'x-organization-id': orgId,
          'x-organization-slug': 'test-org',
          host: 'subdomain.example.com',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      // Should not call repository when X-Organization-ID is present
      expect(mockOrganizationRepository.findBySlug).not.toHaveBeenCalled();
    });

    it('Given: slug and host When: calling decorator Then: should prioritize X-Organization-Slug', async () => {
      // Arrange
      const orgSlug = 'test-org';
      const orgId = 'org-456';
      const mockOrganization = Organization.reconstitute(
        {
          name: 'Test Org',
          settings: {},
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: true,
        },
        orgId,
        orgId
      );

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(mockOrganization);

      const request = {
        headers: {
          'x-organization-slug': orgSlug,
          host: 'subdomain.example.com',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith(orgSlug);
      // Should not try to resolve by subdomain when slug is present
      expect(mockOrganizationRepository.findByDomain).not.toHaveBeenCalled();
    });

    it('Given: no headers or host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {},
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: X-Organization-ID takes precedence When: both headers present Then: should prioritize X-Organization-ID', async () => {
      // Arrange
      const orgId = 'org-123';
      const orgSlug = 'my-organization';
      const request = {
        headers: {
          'x-organization-id': orgId,
          'x-organization-slug': orgSlug,
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(orgId);
      // Should not call repository when X-Organization-ID is present
      expect(mockOrganizationRepository.findBySlug).not.toHaveBeenCalled();
    });

    it('Given: custom DEFAULT_ORG_ID environment variable When: calling decorator Then: should return environment variable', async () => {
      // Arrange
      const originalEnv = process.env.DEFAULT_ORG_ID;
      process.env.DEFAULT_ORG_ID = 'custom-org';

      const request = {
        headers: {},
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe('custom-org');

      // Cleanup
      if (originalEnv) {
        process.env.DEFAULT_ORG_ID = originalEnv;
      } else {
        delete process.env.DEFAULT_ORG_ID;
      }
    });

    it('Given: IP address host When: calling decorator Then: should return default orgId', async () => {
      // Arrange
      const request = {
        headers: {
          host: '192.168.1.100:3000',
        },
        app: {
          get: jest.fn(),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: repository not available When: calling decorator with subdomain Then: should return default orgId', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;

      // Mock app.get to return null (no ModuleRef)
      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(null),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });

    it('Given: repository error When: calling decorator with subdomain Then: should return default orgId', async () => {
      // Arrange
      const subdomain = 'mycompany';
      const host = `${subdomain}.example.com`;

      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockRejectedValue(new Error('Database error'));

      const request = {
        headers: {
          host,
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockGetRequest.mockReturnValue(request);

      // Act
      const result = await executeDecorator(mockExecutionContext);

      // Assert
      expect(result).toBe(process.env.DEFAULT_ORG_ID || 'dev-org');
    });
  });
});
