import { PrismaService } from '@infrastructure/database/prisma.service';
import { ForbiddenException, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { IOrganizationContext } from '@shared/types/http.types';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Get organization identifier from different sources
      const orgIdentifier = this.extractOrganizationId(req);

      if (!orgIdentifier) {
        this.logger.warn(
          '[TenantMiddleware] No organization identifier found - skipping tenant validation'
        );
        // Don't throw error for public endpoints, let decorator handle it
        // For protected endpoints, guards will handle missing orgId
        return next();
      }

      this.logger.log(`[TenantMiddleware] Extracted identifier: ${orgIdentifier}`);

      // Validate that organization exists and is active
      const organization = await this.prisma.organization.findFirst({
        where: {
          OR: [{ id: orgIdentifier }, { slug: orgIdentifier }, { domain: req.headers.host }],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
        },
      });

      if (!organization) {
        this.logger.warn(
          `[TenantMiddleware] Organization not found for identifier: ${orgIdentifier}`
        );
        throw new ForbiddenException('Organization not found or inactive');
      }

      // Set organization context in request
      req.organization = organization as IOrganizationContext;
      req.orgId = organization.id; // IMPORTANT: Always use organization.id, not the identifier

      // Log for debugging - IMPORTANT: Always use organization.id, not the identifier
      this.logger.log(
        `[TenantMiddleware] Setting orgId: ${organization.id} (slug: ${organization.slug}) from identifier: ${orgIdentifier}`
      );

      // If user is authenticated, verify they belong to the organization
      if (req.user && req.user.orgId && req.user.orgId !== organization.id) {
        throw new ForbiddenException('User does not have access to this organization');
      }

      next();
    } catch (error) {
      this.logger.error(
        `[TenantMiddleware] Error: ${error instanceof Error ? error.message : String(error)}`
      );
      next(error);
    }
  }

  private extractOrganizationId(req: Request): string | null {
    // 1. From X-Organization-ID header
    if (req.headers['x-organization-id']) {
      this.logger.debug(
        `[TenantMiddleware] Found orgId in X-Organization-ID header: ${req.headers['x-organization-id']}`
      );
      return req.headers['x-organization-id'] as string;
    }

    // 2. From X-Organization-Slug header
    if (req.headers['x-organization-slug']) {
      this.logger.debug(
        `[TenantMiddleware] Found orgId in X-Organization-Slug header: ${req.headers['x-organization-slug']}`
      );
      return req.headers['x-organization-slug'] as string;
    }

    // 3. From subdomain
    const host = req.headers.host;
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        this.logger.debug(`[TenantMiddleware] Found orgId in subdomain: ${subdomain}`);
        return subdomain;
      }
    }

    // orgId from query params and body are intentionally NOT accepted
    // to prevent tenant-hopping attacks (HIGH-3/MED-4)

    this.logger.debug('[TenantMiddleware] No orgId found in any source');
    return null;
  }
}

// Interfaces are defined in src/shared/types/http.types.ts
