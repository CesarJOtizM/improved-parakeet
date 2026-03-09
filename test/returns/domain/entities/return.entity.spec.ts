import { describe, expect, it } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('Return', () => {
  const customerReturnProps = () => ({
    returnNumber: ReturnNumber.create(2026, 1),
    status: ReturnStatus.create('DRAFT'),
    type: ReturnType.create('RETURN_CUSTOMER'),
    reason: ReturnReason.create('Defective product'),
    warehouseId: 'wh-001',
    saleId: 'sale-001',
    createdBy: 'user-001',
  });

  const supplierReturnProps = () => ({
    returnNumber: ReturnNumber.create(2026, 2),
    status: ReturnStatus.create('DRAFT'),
    type: ReturnType.create('RETURN_SUPPLIER'),
    reason: ReturnReason.create('Wrong shipment'),
    warehouseId: 'wh-001',
    sourceMovementId: 'mov-001',
    createdBy: 'user-001',
  });

  const createCustomerLine = (orgId: string = 'org-123'): ReturnLine => {
    return ReturnLine.create(
      {
        productId: 'prod-001',
        quantity: Quantity.create(3),
        originalSalePrice: SalePrice.create(200, 'COP', 2),
        currency: 'COP',
      },
      orgId,
      ReturnType.create('RETURN_CUSTOMER')
    );
  };

  const createSupplierLine = (orgId: string = 'org-123'): ReturnLine => {
    return ReturnLine.create(
      {
        productId: 'prod-002',
        quantity: Quantity.create(5),
        originalUnitCost: Money.create(100, 'COP', 2),
        currency: 'COP',
      },
      orgId,
      ReturnType.create('RETURN_SUPPLIER')
    );
  };

  describe('create', () => {
    it('Given: valid customer return props When: creating Then: should create successfully', () => {
      // Arrange
      const props = customerReturnProps();

      // Act
      const returnEntity = Return.create(props, 'org-123');

      // Assert
      expect(returnEntity.returnNumber.getValue()).toBe('RETURN-2026-001');
      expect(returnEntity.status.isDraft()).toBe(true);
      expect(returnEntity.type.isCustomerReturn()).toBe(true);
      expect(returnEntity.reason.getValue()).toBe('Defective product');
      expect(returnEntity.warehouseId).toBe('wh-001');
      expect(returnEntity.saleId).toBe('sale-001');
      expect(returnEntity.createdBy).toBe('user-001');
      expect(returnEntity.orgId).toBe('org-123');
    });

    it('Given: valid supplier return props When: creating Then: should create successfully', () => {
      // Arrange
      const props = supplierReturnProps();

      // Act
      const returnEntity = Return.create(props, 'org-123');

      // Assert
      expect(returnEntity.type.isSupplierReturn()).toBe(true);
      expect(returnEntity.sourceMovementId).toBe('mov-001');
      expect(returnEntity.saleId).toBeUndefined();
    });

    it('Given: customer return without saleId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...customerReturnProps(),
        saleId: undefined,
      };

      // Act & Assert
      expect(() => Return.create(props, 'org-123')).toThrow(
        'Sale ID is required for customer returns'
      );
    });

    it('Given: supplier return without sourceMovementId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...supplierReturnProps(),
        sourceMovementId: undefined,
      };

      // Act & Assert
      expect(() => Return.create(props, 'org-123')).toThrow(
        'Source movement ID is required for supplier returns'
      );
    });

    it('Given: valid props When: creating return Then: should have empty lines', () => {
      // Arrange & Act
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Assert
      expect(returnEntity.getLines()).toHaveLength(0);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = customerReturnProps();
      const lines = [createCustomerLine('org-123')];

      // Act
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123', lines);

      // Assert
      expect(returnEntity.id).toBe('ret-001');
      expect(returnEntity.orgId).toBe('org-123');
      expect(returnEntity.getLines()).toHaveLength(1);
    });

    it('Given: no lines provided When: reconstituting Then: should default to empty lines', () => {
      // Arrange & Act
      const returnEntity = Return.reconstitute(customerReturnProps(), 'ret-001', 'org-123');

      // Assert
      expect(returnEntity.getLines()).toHaveLength(0);
    });
  });

  describe('addLine', () => {
    it('Given: DRAFT customer return When: adding customer line Then: should add successfully', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const line = createCustomerLine('org-123');

      // Act
      returnEntity.addLine(line);

      // Assert
      expect(returnEntity.getLines()).toHaveLength(1);
    });

    it('Given: DRAFT supplier return When: adding supplier line Then: should add successfully', () => {
      // Arrange
      const returnEntity = Return.create(supplierReturnProps(), 'org-123');
      const line = createSupplierLine('org-123');

      // Act
      returnEntity.addLine(line);

      // Assert
      expect(returnEntity.getLines()).toHaveLength(1);
    });

    it('Given: DRAFT customer return When: adding line without originalSalePrice Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      // Create a supplier-style line (no originalSalePrice) via reconstitute to bypass ReturnLine.create validation
      const line = ReturnLine.reconstitute(
        {
          productId: 'prod-001',
          quantity: Quantity.create(3),
          originalUnitCost: Money.create(100, 'COP', 2),
          currency: 'COP',
        },
        'line-001',
        'org-123'
      );

      // Act & Assert
      expect(() => returnEntity.addLine(line)).toThrow(
        'Customer return lines must have original sale price'
      );
    });

    it('Given: DRAFT supplier return When: adding line without originalUnitCost Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.create(supplierReturnProps(), 'org-123');
      // Create a customer-style line (no originalUnitCost) via reconstitute to bypass ReturnLine.create validation
      const line = ReturnLine.reconstitute(
        {
          productId: 'prod-001',
          quantity: Quantity.create(3),
          originalSalePrice: SalePrice.create(200, 'COP', 2),
          currency: 'COP',
        },
        'line-001',
        'org-123'
      );

      // Act & Assert
      expect(() => returnEntity.addLine(line)).toThrow(
        'Supplier return lines must have original unit cost'
      );
    });

    it('Given: CONFIRMED return When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CONFIRMED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123', [
        createCustomerLine('org-123'),
      ]);
      const newLine = createCustomerLine('org-123');

      // Act & Assert
      expect(() => returnEntity.addLine(newLine)).toThrow(
        'Lines can only be added when return status is DRAFT'
      );
    });

    it('Given: CANCELLED return When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CANCELLED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');
      const line = createCustomerLine('org-123');

      // Act & Assert
      expect(() => returnEntity.addLine(line)).toThrow(
        'Lines can only be added when return status is DRAFT'
      );
    });
  });

  describe('removeLine', () => {
    it('Given: DRAFT return with lines When: removing existing line Then: should remove successfully', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const line = createCustomerLine('org-123');
      returnEntity.addLine(line);
      const lineId = returnEntity.getLines()[0].id;

      // Act
      returnEntity.removeLine(lineId);

      // Assert
      expect(returnEntity.getLines()).toHaveLength(0);
    });

    it('Given: DRAFT return When: removing non-existent line Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act & Assert
      expect(() => returnEntity.removeLine('non-existent-id')).toThrow(
        'Line with id non-existent-id not found'
      );
    });

    it('Given: CONFIRMED return When: removing line Then: should throw error', () => {
      // Arrange
      const line = createCustomerLine('org-123');
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CONFIRMED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123', [line]);

      // Act & Assert
      expect(() => returnEntity.removeLine(line.id)).toThrow(
        'Lines can only be removed when return status is DRAFT'
      );
    });
  });

  describe('confirm', () => {
    it('Given: DRAFT return with lines When: confirming Then: should transition to CONFIRMED', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      returnEntity.addLine(createCustomerLine('org-123'));

      // Act
      returnEntity.confirm('return-mov-001');

      // Assert
      expect(returnEntity.status.isConfirmed()).toBe(true);
      expect(returnEntity.confirmedAt).toBeDefined();
      expect(returnEntity.returnMovementId).toBe('return-mov-001');
    });

    it('Given: DRAFT return without lines When: confirming Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act & Assert
      expect(() => returnEntity.confirm('return-mov-001')).toThrow(
        'Return must have at least one line before confirming'
      );
    });

    it('Given: CONFIRMED return When: confirming again Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CONFIRMED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123', [
        createCustomerLine('org-123'),
      ]);

      // Act & Assert
      expect(() => returnEntity.confirm('return-mov-002')).toThrow('Return cannot be confirmed');
    });

    it('Given: CANCELLED return When: confirming Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CANCELLED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123', [
        createCustomerLine('org-123'),
      ]);

      // Act & Assert
      expect(() => returnEntity.confirm('return-mov-001')).toThrow('Return cannot be confirmed');
    });
  });

  describe('cancel', () => {
    it('Given: DRAFT return When: cancelling Then: should transition to CANCELLED', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act
      returnEntity.cancel('No longer needed');

      // Assert
      expect(returnEntity.status.isCancelled()).toBe(true);
      expect(returnEntity.cancelledAt).toBeDefined();
    });

    it('Given: CONFIRMED return When: cancelling Then: should transition to CANCELLED', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CONFIRMED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');

      // Act
      returnEntity.cancel('Wrong items');

      // Assert
      expect(returnEntity.status.isCancelled()).toBe(true);
    });

    it('Given: CANCELLED return When: cancelling again Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CANCELLED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');

      // Act & Assert
      expect(() => returnEntity.cancel()).toThrow('Return cannot be cancelled');
    });

    it('Given: DRAFT return When: cancelling with reason Then: should update reason', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act
      returnEntity.cancel('Changed policy');

      // Assert
      expect(returnEntity.reason.getValue()).toBe('Changed policy');
    });
  });

  describe('update', () => {
    it('Given: DRAFT return When: updating note Then: should update successfully', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act
      const updated = returnEntity.update({ note: 'Updated note' });

      // Assert
      expect(updated.note).toBe('Updated note');
    });

    it('Given: DRAFT return When: updating reason Then: should update successfully', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const newReason = ReturnReason.create('New reason');

      // Act
      const updated = returnEntity.update({ reason: newReason });

      // Assert
      expect(updated.reason.getValue()).toBe('New reason');
    });

    it('Given: CONFIRMED return When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CONFIRMED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');

      // Act & Assert
      expect(() => returnEntity.update({ note: 'fail' })).toThrow(
        'Cannot update return when status is CONFIRMED or CANCELLED'
      );
    });

    it('Given: CANCELLED return When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...customerReturnProps(), status: ReturnStatus.create('CANCELLED') };
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');

      // Act & Assert
      expect(() => returnEntity.update({ note: 'fail' })).toThrow(
        'Cannot update return when status is CONFIRMED or CANCELLED'
      );
    });
  });

  describe('getTotalAmount', () => {
    it('Given: customer return with lines When: getting total Then: should sum correctly', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      returnEntity.addLine(createCustomerLine('org-123')); // qty 3, price 200 = 600

      // Act
      const total = returnEntity.getTotalAmount();

      // Assert
      expect(total).not.toBeNull();
      expect(total!.getAmount()).toBe(600);
      expect(total!.getCurrency()).toBe('COP');
    });

    it('Given: return with no lines When: getting total Then: should return null', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act
      const total = returnEntity.getTotalAmount();

      // Assert
      expect(total).toBeNull();
    });
  });

  describe('getLines', () => {
    it('Given: return with lines When: getting lines Then: should return defensive copy', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      returnEntity.addLine(createCustomerLine('org-123'));

      // Act
      const lines = returnEntity.getLines();
      const linesBefore = lines.length;
      lines.pop();

      // Assert
      expect(returnEntity.getLines()).toHaveLength(linesBefore);
    });
  });

  describe('readMetadata', () => {
    it('Given: return entity When: setting read metadata Then: should be accessible', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const metadata = {
        warehouseName: 'Main Warehouse',
        saleNumber: 'SALE-2026-001',
        lineProducts: { 'prod-001': { name: 'Widget', sku: 'WGT-001' } },
      };

      // Act
      returnEntity.setReadMetadata(metadata);

      // Assert
      expect(returnEntity.readMetadata).toBeDefined();
      expect(returnEntity.readMetadata!.warehouseName).toBe('Main Warehouse');
      expect(returnEntity.readMetadata!.saleNumber).toBe('SALE-2026-001');
    });

    it('Given: return entity When: read metadata not set Then: should be undefined', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act & Assert
      expect(returnEntity.readMetadata).toBeUndefined();
    });
  });

  describe('properties', () => {
    it('Given: return with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const props = {
        ...customerReturnProps(),
        note: 'Return note',
        returnMovementId: 'ret-mov-001',
        confirmedAt: new Date('2026-02-01'),
        cancelledAt: new Date('2026-02-05'),
      };

      // Act
      const returnEntity = Return.reconstitute(props, 'ret-001', 'org-123');

      // Assert
      expect(returnEntity.note).toBe('Return note');
      expect(returnEntity.returnMovementId).toBe('ret-mov-001');
      expect(returnEntity.confirmedAt).toEqual(new Date('2026-02-01'));
      expect(returnEntity.cancelledAt).toEqual(new Date('2026-02-05'));
      expect(returnEntity.sourceMovementId).toBeUndefined();
    });

    it('Given: supplier return with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const props = {
        ...supplierReturnProps(),
        note: 'Supplier note',
        returnMovementId: 'ret-mov-002',
      };

      // Act
      const returnEntity = Return.reconstitute(props, 'ret-002', 'org-123');

      // Assert
      expect(returnEntity.sourceMovementId).toBe('mov-001');
      expect(returnEntity.saleId).toBeUndefined();
      expect(returnEntity.returnMovementId).toBe('ret-mov-002');
    });
  });

  describe('cancel', () => {
    it('Given: DRAFT return When: cancelling without reason Then: should not update reason', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const originalReason = returnEntity.reason.getValue();

      // Act
      returnEntity.cancel();

      // Assert
      expect(returnEntity.status.isCancelled()).toBe(true);
      expect(returnEntity.reason.getValue()).toBe(originalReason);
    });
  });

  describe('addLine', () => {
    it('Given: DRAFT return When: adding line with non-positive quantity Then: should throw error', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      const line = ReturnLine.reconstitute(
        {
          productId: 'prod-001',
          quantity: Quantity.create(0.0001), // will be positive
          originalSalePrice: SalePrice.create(200, 'COP', 2),
          currency: 'COP',
        },
        'line-001',
        'org-123'
      );

      // Verify that valid lines are accepted
      returnEntity.addLine(line);
      expect(returnEntity.getLines()).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('Given: DRAFT return When: updating without changes Then: should preserve existing values', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');

      // Act
      const updated = returnEntity.update({});

      // Assert
      expect(updated.note).toBeUndefined();
      expect(updated.reason.getValue()).toBe('Defective product');
    });

    it('Given: DRAFT return with lines When: updating Then: should preserve lines', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      returnEntity.addLine(createCustomerLine('org-123'));

      // Act
      const updated = returnEntity.update({ note: 'Updated' });

      // Assert
      expect(updated.getLines()).toHaveLength(1);
      expect(updated.note).toBe('Updated');
    });
  });

  describe('getTotalAmount', () => {
    it('Given: supplier return with lines When: getting total Then: should sum unit costs', () => {
      // Arrange
      const returnEntity = Return.create(supplierReturnProps(), 'org-123');
      returnEntity.addLine(createSupplierLine('org-123')); // qty 5, cost 100 = 500

      // Act
      const total = returnEntity.getTotalAmount();

      // Assert
      expect(total).not.toBeNull();
      expect(total!.getAmount()).toBe(500);
      expect(total!.getCurrency()).toBe('COP');
    });

    it('Given: return with multiple customer lines When: getting total Then: should sum all', () => {
      // Arrange
      const returnEntity = Return.create(customerReturnProps(), 'org-123');
      returnEntity.addLine(createCustomerLine('org-123')); // qty 3, price 200 = 600
      returnEntity.addLine(createCustomerLine('org-123')); // qty 3, price 200 = 600

      // Act
      const total = returnEntity.getTotalAmount();

      // Assert
      expect(total).not.toBeNull();
      expect(total!.getAmount()).toBe(1200);
    });
  });
});
