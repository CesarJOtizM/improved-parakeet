import { Warehouse } from '@inventory/warehouses/domain/entities/warehouse.entity';
import { Address } from '@inventory/warehouses/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@inventory/warehouses/domain/valueObjects/warehouseCode.valueObject';
import { WarehouseMapper } from '@inventory/warehouses/mappers/warehouse.mapper';
import { describe, expect, it } from '@jest/globals';

describe('WarehouseMapper', () => {
  it('Given: warehouse with address When: mapping Then: should include address placeholder', () => {
    // Arrange
    const warehouse = Warehouse.create(
      {
        code: WarehouseCode.create('WH-001'),
        name: 'Main Warehouse',
        address: Address.create('123 Main St'),
        isActive: true,
      },
      'org-1'
    );

    // Act
    const result = WarehouseMapper.toResponseData(warehouse);

    // Assert
    expect(result.code).toBe('WH-001');
    expect(result.address).toEqual({
      street: '123 Main St',
    });
  });

  it('Given: warehouse without address When: mapping Then: should return undefined address', () => {
    // Arrange
    const warehouse = Warehouse.create(
      {
        code: WarehouseCode.create('WH-002'),
        name: 'Secondary Warehouse',
        isActive: false,
      },
      'org-1'
    );

    // Act
    const result = WarehouseMapper.toResponseData(warehouse);

    // Assert
    expect(result.address).toBeUndefined();
    expect(result.isActive).toBe(false);
  });

  it('Given: list of warehouses When: mapping Then: should map all entries', () => {
    // Arrange
    const warehouses = [
      Warehouse.create(
        {
          code: WarehouseCode.create('WH-003'),
          name: 'Warehouse A',
          isActive: true,
        },
        'org-1'
      ),
      Warehouse.create(
        {
          code: WarehouseCode.create('WH-004'),
          name: 'Warehouse B',
          isActive: true,
        },
        'org-1'
      ),
    ];

    // Act
    const result = WarehouseMapper.toResponseDataList(warehouses);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('WH-003');
    expect(result[1].code).toBe('WH-004');
  });
});
