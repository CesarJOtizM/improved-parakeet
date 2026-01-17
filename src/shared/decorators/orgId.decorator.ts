import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';

/**
 * Helper function to get OrganizationRepository from the application context
 */
async function getOrganizationRepository(
  ctx: ExecutionContext
): Promise<IOrganizationRepository | null> {
  try {
    const request = ctx.switchToHttp().getRequest();
    const app = request.app;

    if (!app) {
      return null;
    }

    // Try to get ModuleRef from the application context
    const moduleRef = app.get(ModuleRef, { strict: false });
    if (!moduleRef) {
      return null;
    }

    // Get the OrganizationRepository
    const orgRepository = moduleRef.get('OrganizationRepository', {
      strict: false,
    }) as IOrganizationRepository | undefined;

    return orgRepository || null;
  } catch (_error) {
    // If repository is not available, return null
    // This maintains backward compatibility during development
    return null;
  }
}

export const OrgId = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<string> => {
    const request = ctx.switchToHttp().getRequest();

    // 0. First, check if TenantMiddleware already set req.orgId (highest priority)
    // This ensures we use the validated orgId from the middleware
    if (request.orgId) {
      return request.orgId;
    }

    // 1. Desde el header X-Organization-ID
    const orgIdFromHeader = request.headers['x-organization-id'];
    if (orgIdFromHeader) {
      return orgIdFromHeader;
    }

    // 2. Desde el header X-Organization-Slug
    const orgSlugFromHeader = request.headers['x-organization-slug'];
    if (orgSlugFromHeader) {
      // Try to resolve slug to orgId
      const orgRepository = await getOrganizationRepository(ctx);
      if (orgRepository) {
        try {
          const organization = await orgRepository.findBySlug(orgSlugFromHeader);
          if (organization && organization.isActive) {
            return organization.id;
          }
        } catch (_error) {
          // If error occurs, fall back to using slug as orgId
          // This maintains backward compatibility
        }
      }
      return orgSlugFromHeader;
    }

    // 2.5. Check body for orgId (body parser has run by now)
    // If it's a slug, try to resolve it to ID
    if (request.body && request.body.orgId) {
      const bodyOrgId = request.body.orgId;
      // Try to resolve if it looks like a slug (not a UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyOrgId
      );
      if (!isUUID) {
        // It's likely a slug, try to resolve it to ID
        const orgRepository = await getOrganizationRepository(ctx);
        if (orgRepository) {
          try {
            const organization = await orgRepository.findBySlug(bodyOrgId);
            if (organization && organization.isActive) {
              // Return the resolved ID, not the slug
              return organization.id;
            }
          } catch (_error) {
            // If error occurs, fall back to using slug as orgId
            // This maintains backward compatibility
          }
        }
      }
      return bodyOrgId;
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
        const orgRepository = await getOrganizationRepository(ctx);
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
            // This maintains backward compatibility during development
          }
        }
      }
    }

    // Por defecto, usar un orgId de desarrollo
    return process.env.DEFAULT_ORG_ID || 'dev-org';
  }
);
