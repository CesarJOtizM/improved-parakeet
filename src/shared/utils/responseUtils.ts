import {
  ApiResponseError,
  ApiResponseSuccess,
  PaginatedResponse,
  PaginationMeta,
} from '@shared/types/apiResponse.types';

export const createSuccessResponse = <T>(message: string, data: T): ApiResponseSuccess<T> => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

export const createErrorResponse = (
  message: string,
  statusCode: number,
  path: string,
  method: string
): ApiResponseError => ({
  success: false,
  message,
  error: {
    statusCode,
    timestamp: new Date().toISOString(),
    path,
    method,
  },
});

export const createPaginatedResponse = <T>(
  message: string,
  data: T[],
  pagination: PaginationMeta
): PaginatedResponse<T> => ({
  success: true,
  message,
  data,
  pagination,
  timestamp: new Date().toISOString(),
});

export const calculatePaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
};
