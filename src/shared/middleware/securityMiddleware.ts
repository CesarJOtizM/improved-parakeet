import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { SECURITY_HEADERS } from '@shared/constants';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Aplicar headers de seguridad
      Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
        res.setHeader(header, value as string);
      });

      // Headers adicionales específicos del contexto
      res.setHeader('X-Request-ID', this.generateRequestId());
      res.setHeader('X-Response-Time', Date.now().toString());

      // Log de seguridad
      this.logSecurityHeaders(req);

      next();
    } catch (error) {
      this.logger.error('Error applying security headers', error);
      next();
    }
  }

  private generateRequestId(): string {
    // Generate a 9-character random string
    const randomPart = Math.random().toString(36).substring(2);
    // Pad or truncate to exactly 9 characters
    const paddedRandom = (randomPart + '0'.repeat(9)).substring(0, 9);
    return `req_${Date.now()}_${paddedRandom}`;
  }

  private logSecurityHeaders(req: Request): void {
    const { method, url, ip } = req;
    const userAgent = req.get('User-Agent') || 'Unknown';

    this.logger.debug(`Security headers applied for ${method} ${url} from ${ip}`, {
      method,
      url,
      ip,
      userAgent,
      securityHeaders: Object.keys(SECURITY_HEADERS),
    });
  }
}
