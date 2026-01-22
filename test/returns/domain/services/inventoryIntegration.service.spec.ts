import { describe, expect, it } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { InventoryIntegrationService } from '@returns/domain/services/inventoryIntegration.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('InventoryIntegrationService', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockMovementId = 'movement-123';

  describe('generateMovementFromCustomerReturn', () => {
    it('Given: a confirmed customer return with lines When: generating movement Then: should create IN movement', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-001'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective product'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          note: 'Customer requested return',
          createdBy: 'user-123',
        },
        'return-123',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-123',
              locationId: 'location-123',
              quantity: Quantity.create(5, 2),
              originalSalePrice: SalePrice.create(100, 'USD'),
              currency: 'USD',
            },
            'line-123',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity);

      // Assert
      expect(movement).toBeDefined();
      expect(movement.type.getValue()).toBe('IN');
      expect(movement.status.getValue()).toBe('DRAFT');
      expect(movement.warehouseId).toBe(mockWarehouseId);
      expect(movement.reference).toBe('RETURN-2024-001');
      expect(movement.reason).toBe('RETURN_CUSTOMER');
      expect(movement.note).toBe('Customer requested return');
      expect(movement.getLines()).toHaveLength(1);
    });

    it('Given: a confirmed customer return without note When: generating movement Then: should create movement with default note', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-002'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-456',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-456',
              locationId: 'location-456',
              quantity: Quantity.create(3, 2),
              originalSalePrice: SalePrice.create(50, 'USD'),
              currency: 'USD',
            },
            'line-456',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity);

      // Assert
      expect(movement.note).toBe('Customer return RETURN-2024-002');
    });

    it('Given: a confirmed customer return with multiple lines When: generating movement Then: should create movement with all lines', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-003'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Multiple issues'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-789',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-1',
              locationId: 'location-1',
              quantity: Quantity.create(2, 2),
              originalSalePrice: SalePrice.create(100, 'USD'),
              currency: 'USD',
            },
            'line-1',
            mockOrgId
          ),
          ReturnLine.reconstitute(
            {
              productId: 'product-2',
              locationId: 'location-2',
              quantity: Quantity.create(5, 2),
              originalSalePrice: SalePrice.create(200, 'USD'),
              currency: 'USD',
            },
            'line-2',
            mockOrgId
          ),
          ReturnLine.reconstitute(
            {
              productId: 'product-3',
              locationId: 'location-3',
              quantity: Quantity.create(1, 2),
              originalSalePrice: SalePrice.create(500, 'USD'),
              currency: 'USD',
            },
            'line-3',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity);

      // Assert
      expect(movement.getLines()).toHaveLength(3);
    });

    it('Given: a DRAFT customer return When: generating movement Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-004'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Test'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-draft',
        mockOrgId
      );

      // Act & Assert
      expect(() =>
        InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity)
      ).toThrow('Can only generate movement from confirmed return');
    });

    it('Given: a supplier return When: generating customer movement Then: should throw error', () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-005'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-supplier',
        mockOrgId
      );

      // Act & Assert
      expect(() =>
        InventoryIntegrationService.generateMovementFromCustomerReturn(supplierReturn)
      ).toThrow('Can only generate IN movement from customer return');
    });
  });

  describe('generateMovementFromSupplierReturn', () => {
    it('Given: a confirmed supplier return with lines When: generating movement Then: should create OUT movement', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-010'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          confirmedAt: new Date(),
          note: 'Returning damaged goods to supplier',
          createdBy: 'user-123',
        },
        'return-supplier-123',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-supplier-1',
              locationId: 'location-supplier-1',
              quantity: Quantity.create(10, 2),
              originalUnitCost: Money.create(25, 'USD'),
              currency: 'USD',
            },
            'line-supplier-1',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity);

      // Assert
      expect(movement).toBeDefined();
      expect(movement.type.getValue()).toBe('OUT');
      expect(movement.status.getValue()).toBe('DRAFT');
      expect(movement.warehouseId).toBe(mockWarehouseId);
      expect(movement.reference).toBe('RETURN-2024-010');
      expect(movement.reason).toBe('RETURN_SUPPLIER');
      expect(movement.note).toBe('Returning damaged goods to supplier');
      expect(movement.getLines()).toHaveLength(1);
    });

    it('Given: a confirmed supplier return without note When: generating movement Then: should create movement with default note', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-011'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Wrong items'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-supplier-456',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-supplier-2',
              locationId: 'location-supplier-2',
              quantity: Quantity.create(5, 2),
              originalUnitCost: Money.create(50, 'USD'),
              currency: 'USD',
            },
            'line-supplier-2',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity);

      // Assert
      expect(movement.note).toBe('Supplier return RETURN-2024-011');
    });

    it('Given: a DRAFT supplier return When: generating movement Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-012'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Test'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-draft-supplier',
        mockOrgId
      );

      // Act & Assert
      expect(() =>
        InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity)
      ).toThrow('Can only generate movement from confirmed return');
    });

    it('Given: a customer return When: generating supplier movement Then: should throw error', () => {
      // Arrange
      const customerReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-013'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-customer-wrong',
        mockOrgId
      );

      // Act & Assert
      expect(() =>
        InventoryIntegrationService.generateMovementFromSupplierReturn(customerReturn)
      ).toThrow('Can only generate OUT movement from supplier return');
    });

    it('Given: a confirmed supplier return with multiple lines When: generating movement Then: should create movement with all lines', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-014'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Multiple defects'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-multi-supplier',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-a',
              locationId: 'location-a',
              quantity: Quantity.create(10, 2),
              originalUnitCost: Money.create(100, 'USD'),
              currency: 'USD',
            },
            'line-a',
            mockOrgId
          ),
          ReturnLine.reconstitute(
            {
              productId: 'product-b',
              locationId: 'location-b',
              quantity: Quantity.create(20, 2),
              originalUnitCost: Money.create(50, 'USD'),
              currency: 'USD',
            },
            'line-b',
            mockOrgId
          ),
        ]
      );

      // Act
      const movement = InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity);

      // Assert
      expect(movement.getLines()).toHaveLength(2);
    });
  });
});
