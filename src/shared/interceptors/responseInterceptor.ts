import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { createSuccessResponse } from '@shared/utils/responseUtils';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      map(data => {
        // If response is already in correct format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If it's a successful response without format, transform it
        if (data !== null && data !== undefined) {
          const message = this.generateDefaultMessage(method, url);
          return createSuccessResponse(message, data);
        }

        // If no data, create empty success response
        return createSuccessResponse('Operation completed successfully', null);
      })
    );
  }

  private generateDefaultMessage(method: string, _url: string): string {
    const methodMap: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource partially updated successfully',
      DELETE: 'Resource deleted successfully',
    };

    return methodMap[method] || 'Operation completed successfully';
  }
}
