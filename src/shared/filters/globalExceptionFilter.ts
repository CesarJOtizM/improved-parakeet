import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
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
    let errorCode = 'UNKNOWN_ERROR';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = Array.isArray(responseObj.message)
          ? (responseObj.message[0] as string)
          : (responseObj.message as string) || exception.message;

        if (typeof responseObj.errorCode === 'string') {
          errorCode = responseObj.errorCode;
        }

        if (
          responseObj.details &&
          typeof responseObj.details === 'object' &&
          !Array.isArray(responseObj.details)
        ) {
          details = responseObj.details as Record<string, unknown>;
        }
      } else {
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_SERVER_ERROR';

      Sentry.captureException(exception);
      this.logger.error(
        `Unhandled error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    const errorResponse = createErrorResponse(
      message,
      statusCode,
      request.url,
      request.method,
      errorCode,
      details
    );

    this.logger.error(
      `Error ${statusCode}: [${errorCode}] ${message} - ${request.method} ${request.url}`
    );

    response.status(statusCode).json(errorResponse);
  }
}
