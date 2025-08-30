// Tipos compartidos para la base de datos y entidades

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  orgId: string;
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
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

export interface IRole {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  id: string;
  name: string;
  description?: string | null;
  module: string;
  action: string;
}

export interface IUserRole {
  id: string;
  userId: string;
  roleId: string;
  orgId: string;
}

export interface IRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
}

export interface IProduct {
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

export interface IWarehouse {
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

export interface IStock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  orgId: string;
}

export interface IMovement {
  id: string;
  type: MovementType;
  status: MovementStatus;
  reference?: string;
  notes?: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMovementLine {
  id: string;
  movementId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  orgId: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
export type MovementStatus = 'DRAFT' | 'POSTED' | 'VOIDED' | 'CANCELLED';

export interface IInventoryBalance {
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

export interface ILowStockAlert {
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
export interface IPaginationOptions {
  skip?: number;
  take?: number;
}

export interface ISortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface IFilterOptions {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

export interface IQueryOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

export interface IQueryResult<T> {
  data: T[];
  total: number;
}

// Tipos para seeds
export interface ISeedResult {
  roles: IRole[];
  permissions: IPermission[];
  adminUser: IUser;
}

export interface IInventorySeedResult {
  warehouses: IWarehouse[];
  products: IProduct[];
}
