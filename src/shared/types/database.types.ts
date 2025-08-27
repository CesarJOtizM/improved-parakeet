// Tipos compartidos para la base de datos y entidades

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  orgId: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  module: string;
  action: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  orgId: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  price: number | { toNumber(): number };
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  orgId: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  status: MovementStatus;
  reference?: string;
  notes?: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovementLine {
  id: string;
  movementId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  orgId: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
export type MovementStatus = 'DRAFT' | 'POSTED' | 'VOIDED' | 'CANCELLED';

export interface InventoryBalance {
  productId: string;
  warehouseId: string;
  orgId: string;
  sku: string;
  productName: string;
  category?: string;
  unit: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  productActive: boolean;
  warehouseActive: boolean;
  lastStockUpdate: Date;
}

export interface LowStockAlert {
  productId: string;
  warehouseId: string;
  orgId: string;
  sku: string;
  productName: string;
  category?: string;
  unit: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'NORMAL';
  lastStockUpdate: Date;
}

// Tipos para filtros y opciones
export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

export interface QueryOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
}

// Tipos para seeds
export interface SeedResult {
  roles: Role[];
  permissions: Permission[];
  adminUser: User;
}

export interface InventorySeedResult {
  warehouses: Warehouse[];
  products: Product[];
}
