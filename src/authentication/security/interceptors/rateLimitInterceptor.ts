import { IRateLimitConfig, RateLimitService } from '@auth/domain/services/rateLimitService';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';

export interface IRateLimitMetadata {
  enabled: boolean;
  type: 'IP' | 'USER';
  customConfig?: IRateLimitConfig;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Verificar si el rate limiting está habilitado para este endpoint
    const rateLimitMetadata = this.reflector.get<IRateLimitMetadata>('rateLimit', handler);

    if (!rateLimitMetadata?.enabled) {
      return next.handle();
    }

    try {
      const identifier = this.getIdentifier(request, rateLimitMetadata.type);

      if (!identifier) {
        this.logger.warn('Could not determine identifier for rate limiting');
        return next.handle();
      }

      // Verificar rate limit
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        identifier,
        rateLimitMetadata.type,
        rateLimitMetadata.customConfig
      );

      if (!rateLimitResult.allowed) {
        // Agregar headers de rate limit a la respuesta
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', rateLimitResult.remaining);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

        if (rateLimitResult.blocked) {
          response.setHeader('X-RateLimit-Blocked', 'true');
          response.setHeader(
            'X-RateLimit-Block-Expires',
            rateLimitResult.blockExpiresAt?.toISOString()
          );
        }

        this.logger.warn(`Rate limit exceeded for ${rateLimitMetadata.type}:${identifier}`);

        throw new HttpException(
          {
            message: 'Rate limit exceeded',
            error: 'Too Many Requests',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            rateLimit: {
              limit: rateLimitResult.remaining,
              remaining: 0,
              resetTime: rateLimitResult.resetTime,
              blocked: rateLimitResult.blocked,
              blockExpiresAt: rateLimitResult.blockExpiresAt,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Agregar headers de rate limit exitoso
      const response = context.switchToHttp().getResponse();
      response.setHeader(
        'X-RateLimit-Limit',
        rateLimitResult.remaining + rateLimitResult.remaining
      );
      response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      response.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toISOString());

      return next.handle();
    } catch (error) {
      if (error instanceof HttpException) {
        return throwError(() => error);
      }

      this.logger.error('Rate limiting interceptor error:', error);
      // En caso de error, permitir la solicitud por seguridad
      return next.handle();
    }
  }

  private getIdentifier(request: Request, type: 'IP' | 'USER'): string | null {
    if (type === 'USER') {
      // Para rate limiting por usuario, usar el ID del usuario si está autenticado
      return request.user?.id || null;
    } else {
      // Para rate limiting por IP
      const forwardedFor = request.headers['x-forwarded-for'];
      const realIp = request.headers['x-real-ip'];

      if (typeof forwardedFor === 'string') return forwardedFor;
      if (typeof realIp === 'string') return realIp;
      if (request.connection?.remoteAddress) return request.connection.remoteAddress;
      if (request.socket?.remoteAddress) return request.socket.remoteAddress;
      if (request.ip) return request.ip;

      return 'unknown';
    }
  }
}
