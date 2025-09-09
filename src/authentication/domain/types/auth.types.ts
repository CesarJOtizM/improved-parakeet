// Tipos compartidos para el dominio de autenticación

export type AuthStatus = 'SUCCESS' | 'FAILED' | 'LOCKED' | 'EXPIRED';

export type LoginResult = {
  status: AuthStatus;
  user?: {
    id: string;
    email: string;
    username: string;
    name: string;
    orgId: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
  errors?: string[];
};

export type RegistrationResult = {
  status: AuthStatus;
  user?: {
    id: string;
    email: string;
    username: string;
    name: string;
    orgId: string;
  };
  message: string;
  errors?: string[];
};

export type PasswordResetResult = {
  status: AuthStatus;
  message: string;
  errors?: string[];
};

export type TokenValidationResult = {
  isValid: boolean;
  userId?: string;
  orgId?: string;
  permissions?: string[];
  roles?: string[];
  expiresAt?: Date;
  errors?: string[];
};

export type PermissionCheckResult = {
  hasPermission: boolean;
  requiredPermission: string;
  userPermissions: string[];
  reason?: string;
};

export type RoleAssignmentResult = {
  success: boolean;
  userId: string;
  roleId: string;
  message: string;
  errors?: string[];
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  name: string;
  status: string;
  orgId: string;
  roles: string[];
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionInfo = {
  id: string;
  userId: string;
  orgId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
};
