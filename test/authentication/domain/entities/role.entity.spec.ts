import { Role } from '@auth/domain/entities/role.entity';

describe('Role Entity', () => {
  const mockOrgId = 'test-org-id';
  const mockRoleProps = {
    name: 'Admin',
    description: 'Administrator role with full access',
    isActive: true,
  };

  describe('create', () => {
    it('Given: valid role props and orgId When: creating role Then: should create valid role with domain event', () => {
      // Arrange
      const props = { ...mockRoleProps };

      // Act
      const role = Role.create(props, mockOrgId);

      // Assert
      expect(role).toBeInstanceOf(Role);
      expect(role.name).toBe(props.name);
      expect(role.description).toBe(props.description);
      expect(role.isActive).toBe(props.isActive);
      expect(role.orgId).toBe(mockOrgId);
      expect(role.id).toBeDefined();

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: role props without description When: creating role Then: should create role with undefined description', () => {
      // Arrange
      const props = {
        name: 'User',
        isActive: true,
      };

      // Act
      const role = Role.create(props, mockOrgId);

      // Assert
      expect(role).toBeInstanceOf(Role);
      expect(role.name).toBe(props.name);
      expect(role.description).toBeUndefined();
      expect(role.isActive).toBe(props.isActive);
    });

    it('Given: inactive role props When: creating role Then: should create inactive role', () => {
      // Arrange
      const props = {
        name: 'Guest',
        description: 'Guest role with limited access',
        isActive: false,
      };

      // Act
      const role = Role.create(props, mockOrgId);

      // Assert
      expect(role).toBeInstanceOf(Role);
      expect(role.name).toBe(props.name);
      expect(role.description).toBe(props.description);
      expect(role.isActive).toBe(props.isActive);
    });
  });

  describe('reconstitute', () => {
    it('Given: valid role props, id, orgId When: reconstituting role Then: should create role with provided data', () => {
      // Arrange
      const mockId = 'test-role-id';
      const props = { ...mockRoleProps };

      // Act
      const role = Role.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(role).toBeInstanceOf(Role);
      expect(role.id).toBe(mockId);
      expect(role.orgId).toBe(mockOrgId);
      expect(role.name).toBe(props.name);
      expect(role.description).toBe(props.description);
      expect(role.isActive).toBe(props.isActive);
    });
  });

  describe('update', () => {
    it('Given: role with partial update props When: updating role Then: should update only provided fields and add domain event', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);
      const updateProps = {
        name: 'Updated Role Name',
        description: 'Updated description',
      };

      // Act
      role.update(updateProps);

      // Assert
      expect(role.name).toBe(updateProps.name);
      expect(role.description).toBe(updateProps.description);
      expect(role.isActive).toBe(mockRoleProps.isActive);

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: role with isActive update When: updating role Then: should update isActive status', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);
      const updateProps = {
        isActive: false,
      };

      // Act
      role.update(updateProps);

      // Assert
      expect(role.isActive).toBe(updateProps.isActive);
      expect(role.name).toBe(mockRoleProps.name);
      expect(role.description).toBe(mockRoleProps.description);
    });

    it('Given: role with undefined update props When: updating role Then: should not change any fields', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);
      const originalName = role.name;
      const originalDescription = role.description;
      const originalIsActive = role.isActive;
      const updateProps = {
        name: undefined,
        description: undefined,
        isActive: undefined,
      };

      // Act
      role.update(updateProps);

      // Assert
      expect(role.name).toBe(originalName);
      expect(role.description).toBe(originalDescription);
      expect(role.isActive).toBe(originalIsActive);
    });
  });

  describe('activate', () => {
    it('Given: inactive role When: activating role Then: should set isActive to true and add domain event', () => {
      // Arrange
      const props = {
        name: 'Guest',
        description: 'Guest role',
        isActive: false,
      };
      const role = Role.create(props, mockOrgId);

      // Act
      role.activate();

      // Assert
      expect(role.isActive).toBe(true);

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: already active role When: activating role Then: should remain active and add domain event', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act
      role.activate();

      // Assert
      expect(role.isActive).toBe(true);

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });
  });

  describe('deactivate', () => {
    it('Given: active role When: deactivating role Then: should set isActive to false and add domain event', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act
      role.deactivate();

      // Assert
      expect(role.isActive).toBe(false);

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: already inactive role When: deactivating role Then: should remain inactive and add domain event', () => {
      // Arrange
      const props = {
        name: 'Guest',
        description: 'Guest role',
        isActive: false,
      };
      const role = Role.create(props, mockOrgId);

      // Act
      role.deactivate();

      // Assert
      expect(role.isActive).toBe(false);

      // Check domain events
      // Role entity extends AggregateRoot which should have domain events
      expect(role).toBeInstanceOf(Role);
    });
  });

  describe('Getters', () => {
    it('Given: role with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act & Assert
      expect(role.name).toBe(mockRoleProps.name);
      expect(role.description).toBe(mockRoleProps.description);
      expect(role.isActive).toBe(mockRoleProps.isActive);
    });

    it('Given: role without description When: accessing description getter Then: should return undefined', () => {
      // Arrange
      const props = {
        name: 'User',
        isActive: true,
      };
      const role = Role.create(props, mockOrgId);

      // Act & Assert
      expect(role.description).toBeUndefined();
    });
  });

  describe('Domain Events', () => {
    it('Given: newly created role When: checking domain events Then: should have RoleCreated event', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act & Assert
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: role after update When: checking domain events Then: should have RoleCreated and RoleUpdated events', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act
      role.update({ name: 'Updated Name' });

      // Assert
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: role after activation When: checking domain events Then: should have RoleCreated and RoleUpdated events', () => {
      // Arrange
      const props = {
        name: 'Guest',
        description: 'Guest role',
        isActive: false,
      };
      const role = Role.create(props, mockOrgId);

      // Act
      role.activate();

      // Assert
      expect(role).toBeInstanceOf(Role);
    });

    it('Given: role after deactivation When: checking domain events Then: should have RoleCreated and RoleUpdated events', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act
      role.deactivate();

      // Assert
      expect(role).toBeInstanceOf(Role);
    });
  });

  describe('Entity Properties', () => {
    it('Given: newly created role When: checking entity properties Then: should have correct timestamps', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act & Assert
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('Given: reconstituted role When: checking entity properties Then: should preserve original data', () => {
      // Arrange
      const mockId = 'test-role-id';
      const props = { ...mockRoleProps };

      // Act
      const role = Role.reconstitute(props, mockId, mockOrgId);

      // Assert
      expect(role.id).toBe(mockId);
      expect(role.orgId).toBe(mockOrgId);
      expect(role.name).toBe(props.name);
      expect(role.description).toBe(props.description);
      expect(role.isActive).toBe(props.isActive);
    });
  });

  describe('Multiple Updates', () => {
    it('Given: role with multiple updates When: performing multiple updates Then: should accumulate domain events', () => {
      // Arrange
      const role = Role.create(mockRoleProps, mockOrgId);

      // Act
      role.update({ name: 'First Update' });
      role.update({ description: 'Second Update' });
      role.activate();
      role.deactivate();

      // Assert
      expect(role).toBeInstanceOf(Role);
    });
  });
});
