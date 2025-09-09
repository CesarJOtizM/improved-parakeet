import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class ClientIpMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ClientIpMiddleware.name);
  private readonly trustedProxies: string[] = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
  ];

  use(req: Request, _res: Response, next: NextFunction): void {
    try {
      const clientIp = this.extractClientIp(req);

      // Agregar IP a los headers para uso posterior
      req.headers['x-real-ip'] = clientIp;

      this.logger.debug(`Client IP extracted: ${clientIp} for ${req.method} ${req.path}`);
    } catch (error) {
      this.logger.warn('Failed to extract client IP, using fallback:', error);
      // No podemos asignar a req.ip ya que es readonly
    }

    next();
  }

  private extractClientIp(req: Request): string {
    // Verificar headers de confianza primero
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const forwarded = req.headers['x-forwarded'] as string;
    const clientIp = req.headers['x-client-ip'] as string;
    const clusterClientIp = req.headers['x-cluster-client-ip'] as string;

    // Si tenemos un header de IP real, usarlo
    if (realIp && this.isValidIp(realIp)) {
      return this.extractFirstIp(realIp);
    }

    // Si tenemos x-forwarded-for, procesarlo
    if (forwardedFor && this.isValidIp(forwardedFor)) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());

      // Encontrar la primera IP que no sea de un proxy confiable
      for (const ip of ips) {
        if (!this.isTrustedProxy(ip)) {
          return ip;
        }
      }

      // Si todas son proxies confiables, usar la primera
      return ips[0];
    }

    // Verificar otros headers
    if (forwarded && this.isValidIp(forwarded)) {
      return this.extractFirstIp(forwarded);
    }

    if (clientIp && this.isValidIp(clientIp)) {
      return this.extractFirstIp(clientIp);
    }

    if (clusterClientIp && this.isValidIp(clusterClientIp)) {
      return this.extractFirstIp(clusterClientIp);
    }

    // Fallback a la IP de conexión
    const connectionIp = req.connection?.remoteAddress || req.socket?.remoteAddress;
    if (connectionIp && this.isValidIp(connectionIp)) {
      return connectionIp;
    }

    // Último fallback
    return 'unknown';
  }

  private isValidIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    // Validar IPv4
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) {
      return true;
    }

    // Validar IPv6
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }

    // Validar IPv6 comprimida
    const ipv6CompressedRegex = /^(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6CompressedRegex.test(ip)) {
      return true;
    }

    return false;
  }

  private extractFirstIp(ipString: string): string {
    // Extraer la primera IP de una cadena que puede contener múltiples IPs
    const firstIp = ipString.split(',')[0].trim();
    return firstIp;
  }

  private isTrustedProxy(ip: string): boolean {
    // Verificar si la IP está en la lista de proxies confiables
    return this.trustedProxies.some(trusted => {
      if (trusted.includes('/')) {
        // Es un rango CIDR
        return this.isIpInCidrRange(ip, trusted);
      }
      return ip === trusted;
    });
  }

  private isIpInCidrRange(ip: string, cidr: string): boolean {
    try {
      const [network, bits] = cidr.split('/');
      const mask = ~((1 << (32 - parseInt(bits))) - 1);

      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);

      return (ipNum & mask) === (networkNum & mask);
    } catch (_error) {
      return false;
    }
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}
