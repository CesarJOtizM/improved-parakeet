import { describe, expect, it } from '@jest/globals';
import { Location } from '@warehouse/domain/entities/location.entity';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

describe('Location', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  const createLocationProps = (
    overrides: Partial<{
      code: string;
      name: string;
      warehouseId: string;
      isDefault: boolean;
      isActive: boolean;
    }> = {}
  ) => ({
    code: LocationCode.create(overrides.code || 'LOC-001'),
    name: overrides.name || 'Test Location',
    warehouseId: overrides.warehouseId || mockWarehouseId,
    isDefault: overrides.isDefault ?? false,
    isActive: overrides.isActive ?? true,
  });

  describe('create', () => {
    it('Given: valid location props When: creating location Then: should create successfully', () => {
      // Arrange
      const props = createLocationProps();

      // Act
      const location = Location.create(props, mockOrgId);

      // Assert
      expect(location).toBeDefined();
      expect(location.code.getValue()).toBe('LOC-001');
      expect(location.name).toBe('Test Location');
      expect(location.warehouseId).toBe(mockWarehouseId);
      expect(location.isDefault).toBe(false);
      expect(location.isActive).toBe(true);
    });

    it('Given: location props When: creating location Then: should emit LocationAddedEvent', () => {
      // Arrange
      const props = createLocationProps();

      // Act
      const location = Location.create(props, mockOrgId);
      const events = location.domainEvents;

      // Assert
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('LocationAdded');
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props and id When: reconstituting location Then: should create location with id', () => {
      // Arrange
      const props = createLocationProps();

      // Act
      const location = Location.reconstitute(props, 'location-123', mockOrgId);

      // Assert
      expect(location).toBeDefined();
      expect(location.id).toBe('location-123');
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

    it('Given: location When: updating isDefault Then: should update isDefault', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isDefault: false }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.update({ isDefault: true });

      // Assert
      expect(location.isDefault).toBe(true);
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
      location.update({ code: undefined, name: undefined });

      // Assert
      expect(location.name).toBe('Original Name');
    });
  });

  describe('setAsDefault', () => {
    it('Given: non-default location When: setting as default Then: should become default', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isDefault: false }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.setAsDefault();

      // Assert
      expect(location.isDefault).toBe(true);
    });
  });

  describe('removeAsDefault', () => {
    it('Given: default location When: removing as default Then: should not be default', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isDefault: true }),
        'loc-1',
        mockOrgId
      );

      // Act
      location.removeAsDefault();

      // Assert
      expect(location.isDefault).toBe(false);
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

  describe('getters', () => {
    it('Given: location When: getting code Then: should return code', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ code: 'TEST-CODE' }),
        'loc-1',
        mockOrgId
      );

      // Act & Assert
      expect(location.code.getValue()).toBe('TEST-CODE');
    });

    it('Given: location When: getting name Then: should return name', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ name: 'Test Name' }),
        'loc-1',
        mockOrgId
      );

      // Act & Assert
      expect(location.name).toBe('Test Name');
    });

    it('Given: location When: getting warehouseId Then: should return warehouseId', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ warehouseId: 'specific-warehouse' }),
        'loc-1',
        mockOrgId
      );

      // Act & Assert
      expect(location.warehouseId).toBe('specific-warehouse');
    });

    it('Given: default location When: getting isDefault Then: should return true', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isDefault: true }),
        'loc-1',
        mockOrgId
      );

      // Act & Assert
      expect(location.isDefault).toBe(true);
    });

    it('Given: active location When: getting isActive Then: should return true', () => {
      // Arrange
      const location = Location.reconstitute(
        createLocationProps({ isActive: true }),
        'loc-1',
        mockOrgId
      );

      // Act & Assert
      expect(location.isActive).toBe(true);
    });
  });
});
