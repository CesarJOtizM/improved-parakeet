import type {
  IApiResponseError,
  IApiResponseSuccess,
  IPaginatedResponse,
  IPaginationMeta,
} from '@shared/types/apiResponse.types';

export const createSuccessResponse = <T>(message: string, data: T): IApiResponseSuccess<T> => ({
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
): IApiResponseError => ({
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
  pagination: IPaginationMeta
): IPaginatedResponse<T> => ({
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
): IPaginationMeta => {
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
