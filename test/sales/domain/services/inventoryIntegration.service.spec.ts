import { describe, expect, it } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { InventoryIntegrationService } from '@sale/domain/services/inventoryIntegration.service';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('InventoryIntegrationService', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  describe('generateMovementFromSale', () => {
    it('Given: a confirmed sale with lines When: generating movement Then: should create OUT movement', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-001'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          note: 'Customer order',
          createdBy: 'user-123',
        },
        'sale-123',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-123',
              locationId: 'location-123',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-123',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSale(sale);

      // Assert
      expect(movement).toBeDefined();
      expect(movement.type.getValue()).toBe('OUT');
      expect(movement.status.getValue()).toBe('DRAFT');
      expect(movement.warehouseId).toBe(mockWarehouseId);
      expect(movement.reference).toBe('SALE-2024-001');
      expect(movement.reason).toBe('SALE');
      expect(movement.note).toBe('Customer order');
      expect(movement.getLines()).toHaveLength(1);
    });

    it('Given: a confirmed sale without note When: generating movement Then: should create movement with default note', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-002'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-456',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-456',
              locationId: 'location-456',
              quantity: Quantity.create(3, 2),
              salePrice: SalePrice.create(50, 'USD'),
            },
            'line-456',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSale(sale);

      // Assert
      expect(movement.note).toBe('Sale SALE-2024-002');
    });

    it('Given: a confirmed sale with multiple lines When: generating movement Then: should create movement with all lines', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-003'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-789',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-1',
              locationId: 'location-1',
              quantity: Quantity.create(2, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-1',
            mockOrgId
          ),
          SaleLine.reconstitute(
            {
              productId: 'product-2',
              locationId: 'location-2',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(200, 'USD'),
            },
            'line-2',
            mockOrgId
          ),
          SaleLine.reconstitute(
            {
              productId: 'product-3',
              locationId: 'location-3',
              quantity: Quantity.create(1, 2),
              salePrice: SalePrice.create(500, 'USD'),
            },
            'line-3',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSale(sale);

      // Assert
      expect(movement.getLines()).toHaveLength(3);
    });

    it('Given: a DRAFT sale When: generating movement Then: should throw error', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-004'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-draft',
        mockOrgId
      );

      // Act & Assert
      expect(() => InventoryIntegrationService.generateMovementFromSale(sale)).toThrow(
        'Can only generate movement from confirmed sale'
      );
    });

    it('Given: a CANCELLED sale When: generating movement Then: should throw error', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-005'),
          status: SaleStatus.create('CANCELLED'),
          warehouseId: mockWarehouseId,
          cancelledAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-cancelled',
        mockOrgId
      );

      // Act & Assert
      expect(() => InventoryIntegrationService.generateMovementFromSale(sale)).toThrow(
        'Can only generate movement from confirmed sale'
      );
    });

    it('Given: a confirmed sale with specific createdBy When: generating movement Then: should preserve createdBy', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-006'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'specific-user-id',
        },
        'sale-user',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-user',
              locationId: 'location-user',
              quantity: Quantity.create(1, 2),
              salePrice: SalePrice.create(10, 'USD'),
            },
            'line-user',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSale(sale);

      // Assert
      expect(movement.createdBy).toBe('specific-user-id');
    });

    it('Given: a confirmed sale with specific warehouse When: generating movement Then: should use same warehouse', () => {
      // Arrange
      const specificWarehouseId = 'specific-warehouse-id';
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-007'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: specificWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-warehouse',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-warehouse',
              locationId: 'location-warehouse',
              quantity: Quantity.create(1, 2),
              salePrice: SalePrice.create(10, 'USD'),
            },
            'line-warehouse',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSale(sale);

      // Assert
      expect(movement.warehouseId).toBe(specificWarehouseId);
    });
  });
});
