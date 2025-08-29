// Tipos para extensiones de Express Request

export interface AuthenticatedUser {
  id: string;
  orgId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  jti: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  domain?: string;
}

// Extender la interfaz Request de Express
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: OrganizationContext;
      orgId?: string;
      userPermissions?: string[];
      userRoles?: string[];
    }
  }
}
