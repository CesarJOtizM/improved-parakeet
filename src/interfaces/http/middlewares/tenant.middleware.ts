import { PrismaService } from '@infrastructure/database/prisma.service';
import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { IOrganizationContext } from '@shared/types/http.types';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      // Obtener el identificador de la organización desde diferentes fuentes
      const orgId = this.extractOrganizationId(req);

      if (!orgId) {
        throw new ForbiddenException('Identificador de organización requerido');
      }

      // Validar que la organización existe y está activa
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
        throw new ForbiddenException('Organización no encontrada o inactiva');
      }

      // Establecer el contexto de la organización en el request
      req.organization = organization as IOrganizationContext;
      req.orgId = organization.id;

      // Si hay un usuario autenticado, verificar que pertenece a la organización
      if (req.user && req.user.orgId && req.user.orgId !== organization.id) {
        throw new ForbiddenException('Usuario no tiene acceso a esta organización');
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  private extractOrganizationId(req: Request): string | null {
    // 1. Desde el header X-Organization-ID
    if (req.headers['x-organization-id']) {
      return req.headers['x-organization-id'] as string;
    }

    // 2. Desde el header X-Organization-Slug
    if (req.headers['x-organization-slug']) {
      return req.headers['x-organization-slug'] as string;
    }

    // 3. Desde el subdominio
    const host = req.headers.host;
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    // 4. Desde el query parameter
    if (req.query.orgId) {
      return req.query.orgId as string;
    }

    // 5. Desde el body (para POST/PUT requests)
    if (req.body && req.body.orgId) {
      return req.body.orgId as string;
    }

    return null;
  }
}

// Las interfaces están definidas en src/shared/types/http.types.ts
