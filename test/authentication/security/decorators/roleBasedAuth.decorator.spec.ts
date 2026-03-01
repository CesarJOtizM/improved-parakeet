import { describe, expect, it } from '@jest/globals';
import {
  ROLE_BASED_AUTH_KEY,
  RequireRoles,
  RequireAllRoles,
  RequireAnyRole,
  RequireOrganizationAccess,
  AllowSuperAdmin,
  AllowOrganizationAdmin,
  SuperAdminOnly,
  OrganizationAdminOnly,
} from '@auth/security/decorators/roleBasedAuth.decorator';

/**
 * Helper: applies a SetMetadata decorator to a dummy method and reads back
 * the metadata stored under ROLE_BASED_AUTH_KEY.
 */
function getMetadataFromDecorator(decorator: MethodDecorator) {
  class DummyController {
    dummyMethod() {}
  }
  const descriptor = Object.getOwnPropertyDescriptor(DummyController.prototype, 'dummyMethod')!;
  decorator(DummyController.prototype, 'dummyMethod', descriptor);
  return Reflect.getMetadata(ROLE_BASED_AUTH_KEY, DummyController.prototype.dummyMethod);
}

describe('roleBasedAuth.decorator', () => {
  describe('ROLE_BASED_AUTH_KEY', () => {
    it('Given: the constant When: accessed Then: should equal roleBasedAuthOptions', () => {
      // Assert
      expect(ROLE_BASED_AUTH_KEY).toBe('roleBasedAuthOptions');
    });
  });

  describe('RequireRoles', () => {
    it('Given: roles array with no options When: applied Then: should set requiredRoles metadata', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN', 'SUPERVISOR']);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN', 'SUPERVISOR'],
      });
    });

    it('Given: roles with requireAllRoles option When: applied Then: should merge options into metadata', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN', 'SUPERVISOR'], { requireAllRoles: true });

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN', 'SUPERVISOR'],
        requireAllRoles: true,
      });
    });

    it('Given: roles with checkOrganization option When: applied Then: should include checkOrganization in metadata', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN'], { checkOrganization: true });

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        checkOrganization: true,
      });
    });

    it('Given: roles with allowSuperAdmin option When: applied Then: should include allowSuperAdmin in metadata', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN'], { allowSuperAdmin: true });

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        allowSuperAdmin: true,
      });
    });

    it('Given: roles with allowOrganizationAdmin option When: applied Then: should include allowOrganizationAdmin in metadata', () => {
      // Arrange
      const decorator = RequireRoles(['SUPERVISOR'], { allowOrganizationAdmin: true });

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['SUPERVISOR'],
        allowOrganizationAdmin: true,
      });
    });

    it('Given: roles with all options When: applied Then: should merge all options into metadata', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN'], {
        requireAllRoles: true,
        checkOrganization: true,
        allowSuperAdmin: true,
        allowOrganizationAdmin: false,
      });

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        requireAllRoles: true,
        checkOrganization: true,
        allowSuperAdmin: true,
        allowOrganizationAdmin: false,
      });
    });

    it('Given: empty roles array When: applied Then: should set requiredRoles as empty array', () => {
      // Arrange
      const decorator = RequireRoles([]);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({ requiredRoles: [] });
    });
  });

  describe('RequireAllRoles', () => {
    it('Given: roles array When: applied Then: should set requireAllRoles true', () => {
      // Arrange
      const decorator = RequireAllRoles(['ADMIN', 'SUPERVISOR']);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN', 'SUPERVISOR'],
        requireAllRoles: true,
      });
    });

    it('Given: single role When: applied Then: should still wrap in requiredRoles array with requireAllRoles true', () => {
      // Arrange
      const decorator = RequireAllRoles(['ADMIN']);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        requireAllRoles: true,
      });
    });
  });

  describe('RequireAnyRole', () => {
    it('Given: roles array When: applied Then: should set requireAllRoles false', () => {
      // Arrange
      const decorator = RequireAnyRole(['ADMIN', 'SUPERVISOR', 'CONSULTANT']);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN', 'SUPERVISOR', 'CONSULTANT'],
        requireAllRoles: false,
      });
    });

    it('Given: single role When: applied Then: should still set requireAllRoles false', () => {
      // Arrange
      const decorator = RequireAnyRole(['ADMIN']);

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        requireAllRoles: false,
      });
    });
  });

  describe('RequireOrganizationAccess', () => {
    it('Given: RequireOrganizationAccess When: applied Then: should set checkOrganization true', () => {
      // Arrange
      const decorator = RequireOrganizationAccess();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({ checkOrganization: true });
    });

    it('Given: RequireOrganizationAccess When: applied Then: should not set requiredRoles', () => {
      // Arrange
      const decorator = RequireOrganizationAccess();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata.requiredRoles).toBeUndefined();
    });
  });

  describe('AllowSuperAdmin', () => {
    it('Given: AllowSuperAdmin When: applied Then: should set allowSuperAdmin true', () => {
      // Arrange
      const decorator = AllowSuperAdmin();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({ allowSuperAdmin: true });
    });

    it('Given: AllowSuperAdmin When: applied Then: should not set requiredRoles or other flags', () => {
      // Arrange
      const decorator = AllowSuperAdmin();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata.requiredRoles).toBeUndefined();
      expect(metadata.requireAllRoles).toBeUndefined();
      expect(metadata.checkOrganization).toBeUndefined();
    });
  });

  describe('AllowOrganizationAdmin', () => {
    it('Given: AllowOrganizationAdmin When: applied Then: should set allowOrganizationAdmin true', () => {
      // Arrange
      const decorator = AllowOrganizationAdmin();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({ allowOrganizationAdmin: true });
    });

    it('Given: AllowOrganizationAdmin When: applied Then: should not set requiredRoles or other flags', () => {
      // Arrange
      const decorator = AllowOrganizationAdmin();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata.requiredRoles).toBeUndefined();
      expect(metadata.requireAllRoles).toBeUndefined();
      expect(metadata.allowSuperAdmin).toBeUndefined();
    });
  });

  describe('SuperAdminOnly', () => {
    it('Given: SuperAdminOnly When: applied Then: should require SYSTEM_ADMIN role with requireAllRoles true', () => {
      // Arrange
      const decorator = SuperAdminOnly();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['SYSTEM_ADMIN'],
        requireAllRoles: true,
        allowSuperAdmin: false,
      });
    });

    it('Given: SuperAdminOnly When: applied Then: should explicitly set allowSuperAdmin to false', () => {
      // Arrange
      const decorator = SuperAdminOnly();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata.allowSuperAdmin).toBe(false);
    });
  });

  describe('OrganizationAdminOnly', () => {
    it('Given: OrganizationAdminOnly When: applied Then: should require ADMIN role with requireAllRoles true', () => {
      // Arrange
      const decorator = OrganizationAdminOnly();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata).toEqual({
        requiredRoles: ['ADMIN'],
        requireAllRoles: true,
        allowOrganizationAdmin: false,
      });
    });

    it('Given: OrganizationAdminOnly When: applied Then: should explicitly set allowOrganizationAdmin to false', () => {
      // Arrange
      const decorator = OrganizationAdminOnly();

      // Act
      const metadata = getMetadataFromDecorator(decorator);

      // Assert
      expect(metadata.allowOrganizationAdmin).toBe(false);
    });
  });
});
