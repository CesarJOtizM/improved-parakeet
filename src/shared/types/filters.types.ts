/**
 * Tipos compartidos para filtros y paginación
 */

export interface IPaginationOptions {
  limit: number;
  offset: number;
}

export interface IUserFilters {
  orgId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
}

export interface IRoleFilters {
  orgId: string;
  isActive?: boolean;
  search?: string;
}

export interface IPermissionFilters {
  module?: string;
  action?: string;
  search?: string;
}

export interface IWhereClause {
  [key: string]: unknown;
}
