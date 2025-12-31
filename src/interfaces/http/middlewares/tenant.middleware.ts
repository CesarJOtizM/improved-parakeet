import { PrismaService } from '@infrastructure/database/prisma.service';
import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { IOrganizationContext } from '@shared/types/http.types';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Get organization identifier from different sources
      const orgId = this.extractOrganizationId(req);

      if (!orgId) {
        throw new ForbiddenException('Organization identifier required');
      }

      // Validate that organization exists and is active
      const organization = await this.prisma.organization.findFirst({
        where: {
          OR: [{ id: orgId }, { slug: orgId }, { domain: req.headers.host }],
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
        throw new ForbiddenException('Organization not found or inactive');
      }

      // Set organization context in request
      req.organization = organization as IOrganizationContext;
      req.orgId = organization.id;

      // If user is authenticated, verify they belong to the organization
      if (req.user && req.user.orgId && req.user.orgId !== organization.id) {
        throw new ForbiddenException('User does not have access to this organization');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private extractOrganizationId(req: Request): string | null {
    // 1. From X-Organization-ID header
    if (req.headers['x-organization-id']) {
      return req.headers['x-organization-id'] as string;
    }

    // 2. From X-Organization-Slug header
    if (req.headers['x-organization-slug']) {
      return req.headers['x-organization-slug'] as string;
    }

    // 3. From subdomain
    const host = req.headers.host;
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    // 4. From query parameter
    if (req.query.orgId) {
      return req.query.orgId as string;
    }

    // 5. From body (for POST/PUT requests)
    if (req.body && req.body.orgId) {
      return req.body.orgId as string;
    }

    return null;
  }
}

// Interfaces are defined in src/shared/types/http.types.ts
