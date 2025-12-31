import { randomUUID } from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Correlation ID Middleware
 *
 * Adds a correlation ID to each request for tracing purposes.
 * The correlation ID is:
 * - Extracted from X-Correlation-ID header if present
 * - Generated as UUID if not present
 * - Added to request object and response headers
 * - Available in logger context for structured logging
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract correlation ID from header or generate new one
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Add to request object for use in controllers/services
    req.correlationId = correlationId;

    // Add to response headers for client tracking
    res.setHeader('X-Correlation-ID', correlationId);

    // Continue to next middleware
    next();
  }
}

// Extend Express Request type to include correlationId
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
