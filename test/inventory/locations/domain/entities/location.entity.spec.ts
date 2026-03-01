import { describe, expect, it } from '@jest/globals';
import { Location } from '@location/domain/entities/location.entity';
import { LocationCode } from '@location/domain/valueObjects/locationCode.valueObject';
import { LocationType } from '@location/domain/valueObjects/locationType.valueObject';

describe('Location (locations module)', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  const createLocationProps = (
    overrides: Partial<{
      code: string;
      name: string;
      description: string;
      type: string;
      warehouseId: string;
      parentId: string;
      isActive: boolean;
    }> = {}
  ) => ({
    code: LocationCode.create(overrides.code || 'LOC-001'),
    name: overrides.name || 'Test Location',
    description: overrides.description,
    type: LocationType.create(overrides.type || 'ZONE'),
    warehouseId: overrides.warehouseId || mockWarehouseId,
    parentId: overrides.parentId,
    isActive: overrides.isActive ?? true,
  });

  describe('create', () => {
    it('Given: valid props When: creating location Then: should create successfully', () => {
      // Arrange
      const props = createLocationProps();

      // Act
      const location = Location.create(props, mockOrgId);

      // Assert
      expect(location).toBeDefined();
      expect(location.code.getValue()).toBe('LOC-001');
      expect(location.name).toBe('Test Location');
      expect(location.type.getValue()).toBe('ZONE');
      expect(location.warehouseId).toBe(mockWarehouseId);
      expect(location.isActive).toBe(true);
      expect(location.orgId).toBe(mockOrgId);
    });

    it('Given: props with description When: creating location Then: should include description', () => {
      // Arrange
      const props = createLocationProps({ description: 'A test location' });

      // Act
      const location = Location.create(props, mockOrgId);

      // Assert
      expect(location.description).toBe('A test location');
    });

    it('Given: props with parentId When: creating location Then: should include parentId', () => {
      // Arrange
      const props = createLocationProps({ parentId: 'parent-123' });

      // Act
      const location = Location.create(props, mockOrgId);

      // Assert
      expect(location.parentId).toBe('parent-123');
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props and id When: reconstituting Then: should create location with id', () => {
      // Arrange
      const props = createLocationProps();

      // Act
      const location = Location.reconstitute(props, 'loc-123', mockOrgId);

      // Assert
      expect(location).toBeDefined();
      expect(location.id).toBe('loc-123');
      expect(location.orgId).toBe(mockOrgId);
    });
  });

  describe('update', () => {
    it('Given: location When: updating code Then: should update code', () => {
      // Arrange
      const location = Location.reconstitute(createLocationProps(), 'loc-1', mockOrgId);
      const newCode = LocationCode.create('NEW-CODE');

      // Act
      location.update({ code: newCode });

      // Assert
      expect(location.code.getValue()).toBe('NEW-CODE');
    });

    it('Given: location When: updating name Then: should update name', () => {
      // Arrange
      const location = Location.reconstitute(createLocationProps(), 'loc-1', mockOrgId);

      // Act
      location.update({ name: 'Updated Name' });

      // Assert
      expect(location.name).toBe('Updated Name');
    });

    it('Given: location When: updating description Then: should update description', () => {
      // Arrange
      const location = Location.reconstitute(createLocationProps(), 'loc-1', mockOrgId);

      // Act
      location.update({ description: 'New description' });

      // Assert
      expect(location.description).toBe('New description');
    });

    it('Given: location When: updating type Then: should update type', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ type: 'ZONE' }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.update({ type: LocationType.create('RACK') });

      // Assert
      expect(location.type.getValue()).toBe('RACK');
    });

    it('Given: location When: updating parentId Then: should update parentId', () => {
      // Arrange
      const location = Location.reconstitute(createLocationProps(), 'loc-1', mockOrgId);

      // Act
      location.update({ parentId: 'new-parent-123' });

      // Assert
      expect(location.parentId).toBe('new-parent-123');
    });

    it('Given: location When: updating isActive Then: should update isActive', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isActive: true }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.update({ isActive: false });

      // Assert
      expect(location.isActive).toBe(false);
    });

    it('Given: location When: updating with undefined values Then: should not change values', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ name: 'Original Name' }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.update({});

      // Assert
      expect(location.name).toBe('Original Name');
    });
  });

  describe('activate', () => {
    it('Given: inactive location When: activating Then: should become active', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isActive: false }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.activate();

      // Assert
      expect(location.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('Given: active location When: deactivating Then: should become inactive', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isActive: true }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.deactivate();

      // Assert
      expect(location.isActive).toBe(false);
    });
  });

  describe('setParent', () => {
    it('Given: location without parent When: setting parent Then: should set parentId', () => {
      // Arrange
      const location = Location.reconstitute(createLocationProps(), 'loc-1', mockOrgId);

      // Act
      location.setParent('parent-456');

      // Assert
      expect(location.parentId).toBe('parent-456');
    });

    it('Given: location with parent When: removing parent Then: should clear parentId', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ parentId: 'parent-123' }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.setParent(undefined);

      // Assert
      expect(location.parentId).toBeUndefined();
    });
  });

  describe('getters', () => {
    it('Given: location with all props When: getting values Then: should return correct values', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({
          code: 'GET-TEST',
          name: 'Getter Test',
          description: 'Test desc',
          type: 'SHELF',
          warehouseId: 'wh-get',
          parentId: 'par-get',
          isActive: false,
        }),
        'loc-get',
        mockOrgId
      );

      // Act & Assert
      expect(location.code.getValue()).toBe('GET-TEST');
      expect(location.name).toBe('Getter Test');
      expect(location.description).toBe('Test desc');
      expect(location.type.getValue()).toBe('SHELF');
      expect(location.warehouseId).toBe('wh-get');
      expect(location.parentId).toBe('par-get');
      expect(location.isActive).toBe(false);
    });
  });
});
