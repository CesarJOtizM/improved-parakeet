import 'reflect-metadata';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ModuleRef } from '@nestjs/core';
import { OrgId } from '@shared/decorators/orgId.decorator';

import type { IOrganizationRepository } from '@organization/domain/repositories';

describe('OrgId Decorator', () => {
  class TestController {
    test(@OrgId() _orgId: string) {
      return _orgId;
    }
  }

  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
  let mockModuleRef: jest.Mocked<ModuleRef>;

  const buildContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  const getOrgIdFactory = () => {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test') as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => Promise<string>; data: unknown }
    >;
    const paramMetadata = Object.values(metadata)[0];
    return paramMetadata;
  };

  const executeDecorator = async (request: Record<string, unknown>): Promise<string> => {
    const { factory, data } = getOrgIdFactory();
    const context = buildContext(request);
    return factory(data, context);
  };

  beforeEach(() => {
    mockOrganizationRepository = {
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockModuleRef = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ModuleRef>;
  });

  describe('OrgId parameter decorator', () => {
    it('Given: request orgId When: resolving orgId Then: should return request orgId', async () => {
      // Arrange
      const request = {
        orgId: 'org-123',
        headers: {},
      };

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('org-123');
    });

    it('Given: X-Organization-ID header When: resolving orgId Then: should return orgId from header', async () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-id': 'org-456',
        },
      };

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('org-456');
    });

    it('Given: X-Organization-Slug header When: active organization exists Then: should return organization id', async () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-slug': 'acme',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue({
        id: 'org-789',
        isActive: true,
      } as never);

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('org-789');
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith('acme');
    });

    it('Given: X-Organization-Slug header When: repository throws Then: should return slug', async () => {
      // Arrange
      const request = {
        headers: {
          'x-organization-slug': 'fallback-slug',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockRejectedValue(new Error('failure'));

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('fallback-slug');
    });

    it('Given: body orgId slug When: active organization exists Then: should return organization id', async () => {
      // Arrange
      const request = {
        headers: {},
        body: {
          orgId: 'acme',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue({
        id: 'org-999',
        isActive: true,
      } as never);

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('org-999');
      expect(mockOrganizationRepository.findBySlug).toHaveBeenCalledWith('acme');
    });

    it('Given: body orgId UUID When: resolving orgId Then: should return body orgId', async () => {
      // Arrange
      const request = {
        headers: {},
        body: {
          orgId: '123e4567-e89b-12d3-a456-426614174000',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockOrganizationRepository.findBySlug).not.toHaveBeenCalled();
    });

    it('Given: subdomain host When: organization found by domain Then: should return organization id', async () => {
      // Arrange
      const request = {
        headers: {
          host: 'acme.example.com',
        },
        app: {
          get: jest.fn().mockReturnValue(mockModuleRef),
        },
      };
      mockModuleRef.get.mockReturnValue(mockOrganizationRepository);
      mockOrganizationRepository.findBySlug.mockResolvedValue(null);
      mockOrganizationRepository.findByDomain.mockResolvedValue({
        id: 'org-domain',
        isActive: true,
      } as never);

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('org-domain');
      expect(mockOrganizationRepository.findByDomain).toHaveBeenCalledWith('acme.example.com');
    });

    it('Given: missing app When: resolving orgId Then: should return default orgId', async () => {
      // Arrange
      const originalEnv = process.env.DEFAULT_ORG_ID;
      process.env.DEFAULT_ORG_ID = 'default-org';

      const request = {
        headers: {
          host: 'acme.example.com',
        },
      };

      // Act
      const result = await executeDecorator(request);

      // Assert
      expect(result).toBe('default-org');

      // Cleanup
      if (originalEnv) {
        process.env.DEFAULT_ORG_ID = originalEnv;
      } else {
        delete process.env.DEFAULT_ORG_ID;
      }
    });
  });
});
