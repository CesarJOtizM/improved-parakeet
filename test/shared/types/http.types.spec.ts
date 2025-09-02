import type { IAuthenticatedUser, IOrganizationContext } from '@shared/types/http.types';

describe('HTTP Types', () => {
  describe('IAuthenticatedUser', () => {
    it('Given: IAuthenticatedUser interface When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const user: IAuthenticatedUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['ADMIN'],
        permissions: ['USERS:CREATE', 'USERS:READ'],
        jti: 'jwt-token-id',
      };

      // Assert
      expect(user.id).toBeDefined();
      expect(user.orgId).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.roles).toBeDefined();
      expect(user.permissions).toBeDefined();
      expect(user.jti).toBeDefined();
    });

    it('Given: IAuthenticatedUser When: checking types Then: should have correct types', () => {
      // Arrange & Act
      const user: IAuthenticatedUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['ADMIN', 'USER'],
        permissions: ['USERS:CREATE', 'USERS:READ', 'PRODUCTS:CREATE'],
        jti: 'jwt-token-id',
      };

      // Assert
      expect(typeof user.id).toBe('string');
      expect(typeof user.orgId).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.username).toBe('string');
      expect(Array.isArray(user.roles)).toBe(true);
      expect(Array.isArray(user.permissions)).toBe(true);
      expect(typeof user.jti).toBe('string');
    });

    it('Given: IAuthenticatedUser When: checking arrays Then: should have correct array content', () => {
      // Arrange & Act
      const user: IAuthenticatedUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['ADMIN'],
        permissions: ['USERS:CREATE'],
        jti: 'jwt-token-id',
      };

      // Assert
      expect(user.roles).toContain('ADMIN');
      expect(user.permissions).toContain('USERS:CREATE');
      expect(user.roles.length).toBe(1);
      expect(user.permissions.length).toBe(1);
    });
  });

  describe('IOrganizationContext', () => {
    it('Given: IOrganizationContext interface When: checking structure Then: should have correct properties', () => {
      // Arrange & Act
      const organization: IOrganizationContext = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
      };

      // Assert
      expect(organization.id).toBeDefined();
      expect(organization.name).toBeDefined();
      expect(organization.slug).toBeDefined();
      expect(organization.domain).toBeUndefined();
    });

    it('Given: IOrganizationContext with domain When: checking structure Then: should have optional domain', () => {
      // Arrange & Act
      const organization: IOrganizationContext = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'test.com',
      };

      // Assert
      expect(organization.domain).toBeDefined();
    });

    it('Given: IOrganizationContext When: checking types Then: should have correct types', () => {
      // Arrange & Act
      const organization: IOrganizationContext = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'test.com',
      };

      // Assert
      expect(typeof organization.id).toBe('string');
      expect(typeof organization.name).toBe('string');
      expect(typeof organization.slug).toBe('string');
      expect(typeof organization.domain).toBe('string');
    });
  });

  describe('Express Request Extension', () => {
    it('Given: Express Request When: checking extension Then: should have optional user property', () => {
      // Arrange & Act
      const mockRequest = {
        user: undefined,
        organization: undefined,
        orgId: undefined,
        userPermissions: undefined,
        userRoles: undefined,
      };

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockRequest.organization).toBeUndefined();
      expect(mockRequest.orgId).toBeUndefined();
      expect(mockRequest.userPermissions).toBeUndefined();
      expect(mockRequest.userRoles).toBeUndefined();
    });

    it('Given: Express Request When: setting user Then: should have user property', () => {
      // Arrange & Act
      const mockRequest: Partial<Request> & { user?: IAuthenticatedUser } = {};
      const user: IAuthenticatedUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['ADMIN'],
        permissions: ['USERS:CREATE'],
        jti: 'jwt-token-id',
      };

      mockRequest.user = user;

      // Assert
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('user-123');
      expect(mockRequest.user.orgId).toBe('org-123');
    });

    it('Given: Express Request When: setting organization Then: should have organization property', () => {
      // Arrange & Act
      const mockRequest: Partial<Request> & { organization?: IOrganizationContext } = {};
      const organization: IOrganizationContext = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
      };

      mockRequest.organization = organization;

      // Assert
      expect(mockRequest.organization).toBeDefined();
      expect(mockRequest.organization.id).toBe('org-123');
      expect(mockRequest.organization.name).toBe('Test Organization');
    });

    it('Given: Express Request When: setting permissions Then: should have permissions properties', () => {
      // Arrange & Act
      const mockRequest: Partial<Request> & {
        userPermissions?: string[];
        userRoles?: string[];
        orgId?: string;
      } = {};
      const permissions = ['USERS:CREATE', 'USERS:READ'];
      const roles = ['ADMIN', 'USER'];

      mockRequest.userPermissions = permissions;
      mockRequest.userRoles = roles;
      mockRequest.orgId = 'org-123';

      // Assert
      expect(mockRequest.userPermissions).toBeDefined();
      expect(mockRequest.userRoles).toBeDefined();
      expect(mockRequest.orgId).toBeDefined();
      expect(mockRequest.userPermissions).toEqual(permissions);
      expect(mockRequest.userRoles).toEqual(roles);
      expect(mockRequest.orgId).toBe('org-123');
    });
  });
});
