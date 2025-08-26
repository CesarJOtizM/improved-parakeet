import { applyDecorators, Type } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { ApiResponseError, ApiResponseSuccess } from '@shared/types/apiResponse.types';

export class ApiResponseWrapper<T> implements ApiResponseSuccess<T> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Descriptive success message' })
  message!: string;

  @ApiProperty()
  data!: T;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class ApiErrorWrapper implements ApiResponseError {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Error description' })
  message!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 400 },
      timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      path: { type: 'string', example: '/api/debts' },
      method: { type: 'string', example: 'POST' },
    },
  })
  error!: {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
  };
}

export const ApiSuccessResponse = <T extends Type<unknown>>(_model: T, description?: string) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: description || 'Successful response',
      type: ApiResponseWrapper<T>,
    })
  );
};

export const ApiErrorResponses = (...statusCodes: number[]) => {
  return applyDecorators(
    ...statusCodes.map(statusCode =>
      ApiResponse({
        status: statusCode,
        description: getErrorDescription(statusCode),
        type: ApiErrorWrapper,
      })
    )
  );
};

export const ApiStandardResponses = <T extends Type<unknown>>(
  model: T,
  successDescription?: string,
  errorStatusCodes: number[] = [400, 401, 403, 404, 500]
) => {
  return applyDecorators(
    ApiSuccessResponse(model, successDescription),
    ApiErrorResponses(...errorStatusCodes)
  );
};

const getErrorDescription = (statusCode: number): string => {
  const descriptions: Record<number, string> = {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    409: 'Conflict',
    422: 'Unprocessable entity',
    500: 'Internal server error',
  };

  return descriptions[statusCode] || 'Error';
};
