export interface ApiResponseSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiResponseError {
  success: false;
  message: string;
  error: {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
  };
}

export type ApiResponse<T = unknown> = ApiResponseSuccess<T> | ApiResponseError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponseSuccess<T[]> {
  pagination: PaginationMeta;
}
