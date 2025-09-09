import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { createErrorResponse } from '@shared/utils/responseUtils';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = Array.isArray(responseObj.message)
          ? (responseObj.message[0] as string)
          : (responseObj.message as string) || exception.message;
      } else {
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // Log error for debugging
      this.logger.error(
        `Unhandled error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    const errorResponse = createErrorResponse(message, statusCode, request.url, request.method);

    this.logger.error(`Error ${statusCode}: ${message} - ${request.method} ${request.url}`);

    response.status(statusCode).json(errorResponse);
  }
}
