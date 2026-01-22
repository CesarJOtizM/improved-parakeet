import { describe, expect, it } from '@jest/globals';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

describe('Warehouse', () => {
  const mockOrgId = 'org-123';

  const createWarehouseProps = (
    overrides: Partial<{
      code: string;
      name: string;
      address?: string;
      isActive: boolean;
    }> = {}
  ) => ({
    code: WarehouseCode.create(overrides.code || 'WH-001'),
    name: overrides.name || 'Main Warehouse',
    address: overrides.address ? Address.create(overrides.address) : undefined,
    isActive: overrides.isActive ?? true,
  });

  describe('create', () => {
    it('Given: valid props When: creating warehouse Then: should create successfully', () => {
      // Arrange
      const props = createWarehouseProps();

      // Act
      const warehouse = Warehouse.create(props, mockOrgId);

      // Assert
      expect(warehouse).toBeDefined();
      expect(warehouse.code.getValue()).toBe('WH-001');
      expect(warehouse.name).toBe('Main Warehouse');
      expect(warehouse.isActive).toBe(true);
    });

    it('Given: warehouse props When: creating warehouse Then: should emit WarehouseCreatedEvent', () => {
      // Arrange
      const props = createWarehouseProps();

      // Act
      const warehouse = Warehouse.create(props, mockOrgId);

      // Assert
      expect(warehouse.domainEvents).toHaveLength(1);
      expect(warehouse.domainEvents[0].eventName).toBe('WarehouseCreated');
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props and id When: reconstituting warehouse Then: should create with id', () => {
      // Arrange
      const props = createWarehouseProps();

      // Act
      const warehouse = Warehouse.reconstitute(props, 'warehouse-123', mockOrgId);

      // Assert
      expect(warehouse.id).toBe('warehouse-123');
    });
  });

  describe('update', () => {
    it('Given: warehouse When: updating code Then: should update code', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(createWarehouseProps(), 'wh-1', mockOrgId);
      const newCode = WarehouseCode.create('WH-002');

      // Act
      warehouse.update({ code: newCode });

      // Assert
      expect(warehouse.code.getValue()).toBe('WH-002');
    });

    it('Given: warehouse When: updating name Then: should update name', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(createWarehouseProps(), 'wh-1', mockOrgId);

      // Act
      warehouse.update({ name: 'Updated Warehouse' });

      // Assert
      expect(warehouse.name).toBe('Updated Warehouse');
    });

    it('Given: warehouse When: updating address Then: should update address', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(createWarehouseProps(), 'wh-1', mockOrgId);
      const newAddress = Address.create('New Address 456');

      // Act
      warehouse.update({ address: newAddress });

      // Assert
      expect(warehouse.address?.getValue()).toBe('New Address 456');
    });

    it('Given: warehouse When: updating isActive Then: should update isActive', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        createWarehouseProps({ isActive: true }),
        'wh-1',
        mockOrgId
      );

      // Act
      warehouse.update({ isActive: false });

      // Assert
      expect(warehouse.isActive).toBe(false);
    });

    it('Given: warehouse When: updating with undefined values Then: should keep current values', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        createWarehouseProps({ name: 'Original Warehouse' }),
        'wh-1',
        mockOrgId
      );

      // Act
      warehouse.update({ name: undefined, address: undefined });

      // Assert
      expect(warehouse.name).toBe('Original Warehouse');
      expect(warehouse.address).toBeUndefined();
    });
  });

  describe('activate/deactivate', () => {
    it('Given: inactive warehouse When: activating Then: should become active', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        createWarehouseProps({ isActive: false }),
        'wh-1',
        mockOrgId
      );

      // Act
      warehouse.activate();

      // Assert
      expect(warehouse.isActive).toBe(true);
    });

    it('Given: active warehouse When: deactivating Then: should become inactive', () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        createWarehouseProps({ isActive: true }),
        'wh-1',
        mockOrgId
      );

      // Act
      warehouse.deactivate();

      // Assert
      expect(warehouse.isActive).toBe(false);
    });
  });
});
