import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { MetricsService } from '@shared/services/metrics.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Metrics Interceptor
 *
 * Automatically records metrics for HTTP requests:
 * - Request duration
 * - Request count by method, path, and status code
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const path = request.route?.path || request.path;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.metricsService.recordRequestDuration(method, path, duration, statusCode);
        },
        error: error => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.metricsService.recordRequestDuration(method, path, duration, statusCode);
        },
      })
    );
  }
}
