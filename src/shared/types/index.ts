// Tipos genéricos para evitar el uso de 'any'
export type UnknownRecord = Record<string, unknown>;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type Optional<T> = T | undefined;
export type Nullable<T> = T | null;

// Tipos para entidades del dominio
export type EntityId = string;
export type OrganizationId = string;
export type UserId = string;
export type ProductId = string;
export type WarehouseId = string;
export type LocationId = string;
export type MovementId = string;
export type TransferId = string;

// Tipos para validaciones
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

// Tipos para paginación
export type PaginationParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Tipos para filtros
export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type SearchFilters = {
  query?: string;
  categoryId?: string;
  warehouseId?: string;
  status?: string;
  dateRange?: DateRange;
};
