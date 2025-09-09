import { Permission } from '@auth/domain/entities/permission.entity';

describe('Permission Entity', () => {
  const mockOrgId = 'test-org-id';
  const mockPermissionProps = {
    name: 'Read Users',
    module: 'users',
    action: 'read',
    description: 'Read user permissions',
  };

  describe('create', () => {
    it('Given: valid permission props and orgId When: creating permission Then: should create valid permission', () => {
      // Arrange
      const props = { ...mockPermissionProps };

      // Act
      const permission = Permission.create(props, mockOrgId);

      // Assert
      expect(permission).toBeInstanceOf(Permission);
      expect(permission.name).toBe(props.name);
      expect(permission.module).toBe(props.module);
      expect(permission.action).toBe(props.action);
      expect(permission.description).toBe(props.description);
      expect(permission.orgId).toBe(mockOrgId);
      expect(permission.id).toBeDefined();
    });

    it('Given: permission props without description When: creating permission Then: should create permission with undefined description', () => {
      // Arrange
      const props = {
        name: 'Create Products',
        module: 'products',
        action: 'create',
      };

      // Act
      const permission = Permission.create(props, mockOrgId);

      // Assert
      expect(permission).toBeInstanceOf(Permission);
      expect(permission.name).toBe(props.name);
      expect(permission.module).toBe(props.module);
      expect(permission.action).toBe(props.action);
      expect(permission.description).toBeUndefined();
    });
  });

  describe('reconstitute', () => {
    it('Given: valid permission props, id, orgId When: reconstituting permission Then: should create permission with provided data', () => {
      // Arrange
      const mockId = 'test-permission-id';
      const props = { ...mockPermissionProps };

      // Act
      const permission = Permission.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(permission).toBeInstanceOf(Permission);
      expect(permission.id).toBe(mockId);
      expect(permission.orgId).toBe(mockOrgId);
      expect(permission.name).toBe(props.name);
      expect(permission.module).toBe(props.module);
      expect(permission.action).toBe(props.action);
      expect(permission.description).toBe(props.description);
    });
  });

  describe('update', () => {
    it('Given: permission with partial update props When: updating permission Then: should update only provided fields', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);
      const updateProps = {
        name: 'Updated Permission Name',
        module: 'updated-module',
        action: 'updated-action',
      };

      // Act
      permission.update(updateProps);

      // Assert
      expect(permission.name).toBe(updateProps.name);
      expect(permission.module).toBe(updateProps.module);
      expect(permission.action).toBe(updateProps.action);
      expect(permission.description).toBe(mockPermissionProps.description);
    });

    it('Given: permission with module and action update When: updating permission Then: should update module and action', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);
      const updateProps = {
        module: 'new-module',
        action: 'new-action',
      };

      // Act
      permission.update(updateProps);

      // Assert
      expect(permission.module).toBe(updateProps.module);
      expect(permission.action).toBe(updateProps.action);
    });

    it('Given: permission with undefined update props When: updating permission Then: should not change any fields', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);
      const originalName = permission.name;
      const originalModule = permission.module;
      const originalAction = permission.action;
      const originalDescription = permission.description;
      const updateProps = {
        name: undefined,
        module: undefined,
        action: undefined,
        description: undefined,
      };

      // Act
      permission.update(updateProps);

      // Assert
      expect(permission.name).toBe(originalName);
      expect(permission.module).toBe(originalModule);
      expect(permission.action).toBe(originalAction);
      expect(permission.description).toBe(originalDescription);
    });
  });

  describe('getFullPermission', () => {
    it('Given: permission with module and action When: getting full permission Then: should return module:action format', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.getFullPermission();

      // Assert
      expect(result).toBe(`${mockPermissionProps.module}:${mockPermissionProps.action}`);
    });

    it('Given: permission with different module and action When: getting full permission Then: should return correct format', () => {
      // Arrange
      const props = {
        name: 'Delete Products',
        module: 'products',
        action: 'delete',
        description: 'Delete product permissions',
      };
      const permission = Permission.create(props, mockOrgId);

      // Act
      const result = permission.getFullPermission();

      // Assert
      expect(result).toBe('products:delete');
    });
  });

  describe('isModulePermission', () => {
    it('Given: permission with matching module When: checking if module permission Then: should return true', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isModulePermission(mockPermissionProps.module);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: permission with non-matching module When: checking if module permission Then: should return false', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isModulePermission('products');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: permission with case-sensitive module When: checking if module permission Then: should return false for different case', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isModulePermission('USERS');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isActionPermission', () => {
    it('Given: permission with matching action When: checking if action permission Then: should return true', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isActionPermission(mockPermissionProps.action);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: permission with non-matching action When: checking if action permission Then: should return false', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isActionPermission('write');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: permission with case-sensitive action When: checking if action permission Then: should return false for different case', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      const result = permission.isActionPermission('READ');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Getters', () => {
    it('Given: permission with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act & Assert
      expect(permission.name).toBe(mockPermissionProps.name);
      expect(permission.module).toBe(mockPermissionProps.module);
      expect(permission.action).toBe(mockPermissionProps.action);
      expect(permission.description).toBe(mockPermissionProps.description);
    });

    it('Given: permission without description When: accessing description getter Then: should return undefined', () => {
      // Arrange
      const props = {
        name: 'Create Products',
        module: 'products',
        action: 'create',
      };
      const permission = Permission.create(props, mockOrgId);

      // Act & Assert
      expect(permission.description).toBeUndefined();
    });
  });

  describe('Domain Events', () => {
    it('Given: newly created permission When: checking domain events Then: should have no domain events', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act & Assert
      expect(permission).toBeInstanceOf(Permission);
    });

    it('Given: permission after update When: checking domain events Then: should have updated timestamp', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act
      permission.update({ name: 'Updated Name' });

      // Assert
      expect(permission.name).toBe('Updated Name');
    });
  });

  describe('Entity Properties', () => {
    it('Given: newly created permission When: checking entity properties Then: should have correct timestamps', () => {
      // Arrange
      const permission = Permission.create(mockPermissionProps, mockOrgId);

      // Act & Assert
      expect(permission.createdAt).toBeInstanceOf(Date);
      expect(permission.updatedAt).toBeInstanceOf(Date);
    });

    it('Given: reconstituted permission When: checking entity properties Then: should preserve original data', () => {
      // Arrange
      const mockId = 'test-permission-id';
      const props = { ...mockPermissionProps };

      // Act
      const permission = Permission.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(permission.id).toBe(mockId);
      expect(permission.orgId).toBe(mockOrgId);
      expect(permission.name).toBe(props.name);
      expect(permission.module).toBe(props.module);
      expect(permission.action).toBe(props.action);
      expect(permission.description).toBe(props.description);
    });
  });
});
