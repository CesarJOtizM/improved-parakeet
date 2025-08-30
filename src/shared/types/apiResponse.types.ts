export interface IApiResponseSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface IApiResponseError {
  success: false;
  message: string;
  error: {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
  };
}

export type IApiResponse<T = unknown> = IApiResponseSuccess<T> | IApiResponseError;

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IPaginatedResponse<T> extends IApiResponseSuccess<T[]> {
  pagination: IPaginationMeta;
}
