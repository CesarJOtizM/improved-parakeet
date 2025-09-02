// Require Permissions Decorator Tests - Decoradores de metadatos para permisos
// Tests unitarios para los decoradores de metadatos siguiendo AAA y Given-When-Then

import { SetMetadata } from '@nestjs/common';
import {
  PERMISSIONS_KEY,
  RequireAllPermissions,
  RequireAnyPermission,
  RequireOrganization,
  RequirePermissions,
  RequireRoles,
  RequireWarehouseAccess,
} from '@shared/decorators/requirePermissions.decorator';

// Mock SetMetadata para evitar dependencias externas
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Require Permissions Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RequirePermissions', () => {
    it('Given: single permission When: applying decorator Then: should set metadata with array', () => {
      // Arrange
      const permission = 'PRODUCTS:CREATE';
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequirePermissions(permission);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, [permission]);
    });

    it('Given: multiple permissions When: applying decorator Then: should set metadata with all permissions', () => {
      // Arrange
      const permissions = ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE', 'PRODUCTS:DELETE'];
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequirePermissions(...permissions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, permissions);
    });

    it('Given: no permissions When: applying decorator Then: should set metadata with empty array', () => {
      // Arrange
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequirePermissions();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, []);
    });
  });

  describe('RequireAnyPermission', () => {
    it('Given: multiple permissions When: applying decorator Then: should set metadata with ANY type', () => {
      // Arrange
      const permissions = ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'];
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireAnyPermission(...permissions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, {
        type: 'ANY',
        permissions,
      });
    });

    it('Given: single permission When: applying decorator Then: should set metadata with ANY type', () => {
      // Arrange
      const permission = 'PRODUCTS:CREATE';
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireAnyPermission(permission);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, {
        type: 'ANY',
        permissions: [permission],
      });
    });
  });

  describe('RequireAllPermissions', () => {
    it('Given: multiple permissions When: applying decorator Then: should set metadata with ALL type', () => {
      // Arrange
      const permissions = ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'];
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireAllPermissions(...permissions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, {
        type: 'ALL',
        permissions,
      });
    });

    it('Given: single permission When: applying decorator Then: should set metadata with ALL type', () => {
      // Arrange
      const permission = 'PRODUCTS:CREATE';
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireAllPermissions(permission);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(PERMISSIONS_KEY, {
        type: 'ALL',
        permissions: [permission],
      });
    });
  });

  describe('RequireRoles', () => {
    it('Given: single role When: applying decorator Then: should set metadata with roles key', () => {
      // Arrange
      const role = 'ADMIN';
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireRoles(role);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('roles', [role]);
    });

    it('Given: multiple roles When: applying decorator Then: should set metadata with all roles', () => {
      // Arrange
      const roles = ['ADMIN', 'MANAGER', 'USER'];
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireRoles(...roles);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('roles', roles);
    });
  });

  describe('RequireOrganization', () => {
    it('Given: decorator applied When: checking metadata Then: should set requireOrganization to true', () => {
      // Arrange
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireOrganization();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('requireOrganization', true);
    });
  });

  describe('RequireWarehouseAccess', () => {
    it('Given: decorator applied When: checking metadata Then: should set requireWarehouseAccess to true', () => {
      // Arrange
      const mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;

      // Act
      RequireWarehouseAccess();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith('requireWarehouseAccess', true);
    });
  });

  describe('PERMISSIONS_KEY constant', () => {
    it('Given: permissions key When: checking value Then: should have correct string value', () => {
      // Arrange & Act
      const keyValue = PERMISSIONS_KEY;

      // Assert
      expect(keyValue).toBe('permissions');
      expect(typeof keyValue).toBe('string');
    });
  });
});
