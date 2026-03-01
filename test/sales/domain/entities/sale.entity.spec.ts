import { describe, expect, it } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('Sale', () => {
  const defaultProps = () => ({
    saleNumber: SaleNumber.create(2026, 1),
    status: SaleStatus.create('DRAFT'),
    warehouseId: 'wh-001',
    customerReference: 'CUST-001',
    externalReference: 'EXT-001',
    note: 'Test sale',
    createdBy: 'user-001',
  });

  const createLine = (orgId: string = 'org-123'): SaleLine => {
    return SaleLine.create(
      {
        productId: 'prod-001',
        quantity: Quantity.create(5),
        salePrice: SalePrice.create(200, 'COP', 2),
      },
      orgId
    );
  };

  describe('create', () => {
    it('Given: valid props When: creating sale Then: should create successfully', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const sale = Sale.create(props, 'org-123');

      // Assert
      expect(sale.saleNumber.getValue()).toBe('SALE-2026-001');
      expect(sale.status.isDraft()).toBe(true);
      expect(sale.warehouseId).toBe('wh-001');
      expect(sale.customerReference).toBe('CUST-001');
      expect(sale.externalReference).toBe('EXT-001');
      expect(sale.note).toBe('Test sale');
      expect(sale.createdBy).toBe('user-001');
      expect(sale.orgId).toBe('org-123');
    });

    it('Given: minimal props When: creating sale Then: should create with defaults', () => {
      // Arrange
      const props = {
        saleNumber: SaleNumber.create(2026, 2),
        status: SaleStatus.create('DRAFT'),
        warehouseId: 'wh-001',
        createdBy: 'user-001',
      };

      // Act
      const sale = Sale.create(props, 'org-123');

      // Assert
      expect(sale.customerReference).toBeUndefined();
      expect(sale.externalReference).toBeUndefined();
      expect(sale.note).toBeUndefined();
      expect(sale.confirmedAt).toBeUndefined();
      expect(sale.cancelledAt).toBeUndefined();
      expect(sale.movementId).toBeUndefined();
    });

    it('Given: valid props When: creating sale Then: should have empty lines', () => {
      // Arrange & Act
      const sale = Sale.create(defaultProps(), 'org-123');

      // Assert
      expect(sale.getLines()).toHaveLength(0);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = defaultProps();
      const lines = [createLine('org-123')];

      // Act
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', lines);

      // Assert
      expect(sale.id).toBe('sale-001');
      expect(sale.orgId).toBe('org-123');
      expect(sale.getLines()).toHaveLength(1);
    });

    it('Given: no lines provided When: reconstituting Then: should default to empty lines', () => {
      // Arrange & Act
      const sale = Sale.reconstitute(defaultProps(), 'sale-001', 'org-123');

      // Assert
      expect(sale.getLines()).toHaveLength(0);
    });
  });

  describe('addLine', () => {
    it('Given: DRAFT sale When: adding line Then: should add successfully', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      const line = createLine('org-123');

      // Act
      sale.addLine(line);

      // Assert
      expect(sale.getLines()).toHaveLength(1);
    });

    it('Given: CONFIRMED sale When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);
      const newLine = createLine('org-123');

      // Act & Assert
      expect(() => sale.addLine(newLine)).toThrow(
        'Lines can only be added when sale status is DRAFT'
      );
    });

    it('Given: CANCELLED sale When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CANCELLED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');
      const line = createLine('org-123');

      // Act & Assert
      expect(() => sale.addLine(line)).toThrow('Lines can only be added when sale status is DRAFT');
    });
  });

  describe('removeLine', () => {
    it('Given: DRAFT sale with lines When: removing existing line Then: should remove successfully', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      const line = createLine('org-123');
      sale.addLine(line);
      const lineId = sale.getLines()[0].id;

      // Act
      sale.removeLine(lineId);

      // Assert
      expect(sale.getLines()).toHaveLength(0);
    });

    it('Given: DRAFT sale When: removing non-existent line Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.removeLine('non-existent-id')).toThrow(
        'Line with id non-existent-id not found'
      );
    });

    it('Given: CONFIRMED sale When: removing line Then: should throw error', () => {
      // Arrange
      const line = createLine('org-123');
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [line]);

      // Act & Assert
      expect(() => sale.removeLine(line.id)).toThrow(
        'Lines can only be removed when sale status is DRAFT'
      );
    });
  });

  describe('confirm', () => {
    it('Given: DRAFT sale with lines When: confirming Then: should transition to CONFIRMED', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      sale.addLine(createLine('org-123'));

      // Act
      sale.confirm('mov-001', 'user-confirmer');

      // Assert
      expect(sale.status.isConfirmed()).toBe(true);
      expect(sale.confirmedAt).toBeDefined();
      expect(sale.confirmedBy).toBe('user-confirmer');
      expect(sale.movementId).toBe('mov-001');
    });

    it('Given: DRAFT sale without lines When: confirming Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.confirm('mov-001')).toThrow(
        'Sale must have at least one line before confirming'
      );
    });

    it('Given: CONFIRMED sale When: confirming again Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);

      // Act & Assert
      expect(() => sale.confirm('mov-001')).toThrow('Sale cannot be confirmed');
    });

    it('Given: CANCELLED sale When: confirming Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CANCELLED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);

      // Act & Assert
      expect(() => sale.confirm('mov-001')).toThrow('Sale cannot be confirmed');
    });
  });

  describe('startPicking', () => {
    it('Given: CONFIRMED sale When: starting picking Then: should transition to PICKING', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);

      // Act
      sale.startPicking('user-picker');

      // Assert
      expect(sale.status.isPicking()).toBe(true);
      expect(sale.pickedAt).toBeDefined();
      expect(sale.pickedBy).toBe('user-picker');
    });

    it('Given: DRAFT sale When: starting picking Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.startPicking()).toThrow('Sale cannot start picking from current status');
    });

    it('Given: SHIPPED sale When: starting picking Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('SHIPPED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.startPicking()).toThrow('Sale cannot start picking from current status');
    });
  });

  describe('ship', () => {
    it('Given: PICKING sale When: shipping Then: should transition to SHIPPED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('PICKING') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);

      // Act
      sale.ship('TRACK-001', 'FedEx', 'Handle with care', 'user-shipper');

      // Assert
      expect(sale.status.isShipped()).toBe(true);
      expect(sale.shippedAt).toBeDefined();
      expect(sale.shippedBy).toBe('user-shipper');
      expect(sale.trackingNumber).toBe('TRACK-001');
      expect(sale.shippingCarrier).toBe('FedEx');
      expect(sale.shippingNotes).toBe('Handle with care');
    });

    it('Given: DRAFT sale When: shipping Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.ship()).toThrow('Sale cannot be shipped from current status');
    });

    it('Given: CONFIRMED sale When: shipping Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.ship()).toThrow('Sale cannot be shipped from current status');
    });
  });

  describe('complete', () => {
    it('Given: SHIPPED sale When: completing Then: should transition to COMPLETED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('SHIPPED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123', [createLine('org-123')]);

      // Act
      sale.complete('user-completer');

      // Assert
      expect(sale.status.isCompleted()).toBe(true);
      expect(sale.completedAt).toBeDefined();
      expect(sale.completedBy).toBe('user-completer');
    });

    it('Given: DRAFT sale When: completing Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.complete()).toThrow('Sale cannot be completed from current status');
    });

    it('Given: PICKING sale When: completing Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('PICKING') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.complete()).toThrow('Sale cannot be completed from current status');
    });
  });

  describe('markAsReturned', () => {
    it('Given: COMPLETED sale When: marking as returned Then: should transition to RETURNED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('COMPLETED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act
      sale.markAsReturned('user-returner');

      // Assert
      expect(sale.status.isReturned()).toBe(true);
      expect(sale.returnedAt).toBeDefined();
      expect(sale.returnedBy).toBe('user-returner');
    });

    it('Given: SHIPPED sale When: marking as returned Then: should transition to RETURNED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('SHIPPED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act
      sale.markAsReturned('user-returner');

      // Assert
      expect(sale.status.isReturned()).toBe(true);
    });

    it('Given: DRAFT sale When: marking as returned Then: should throw error', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => sale.markAsReturned()).toThrow(
        'Sale cannot be marked as returned from current status'
      );
    });
  });

  describe('cancel', () => {
    it('Given: DRAFT sale When: cancelling Then: should transition to CANCELLED', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act
      sale.cancel('No longer needed', 'user-canceller');

      // Assert
      expect(sale.status.isCancelled()).toBe(true);
      expect(sale.cancelledAt).toBeDefined();
      expect(sale.cancelledBy).toBe('user-canceller');
    });

    it('Given: CONFIRMED sale When: cancelling Then: should transition to CANCELLED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act
      sale.cancel('Changed mind');

      // Assert
      expect(sale.status.isCancelled()).toBe(true);
    });

    it('Given: PICKING sale When: cancelling Then: should transition to CANCELLED', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('PICKING') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act
      sale.cancel();

      // Assert
      expect(sale.status.isCancelled()).toBe(true);
    });

    it('Given: SHIPPED sale When: cancelling Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('SHIPPED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.cancel()).toThrow('Sale cannot be cancelled');
    });

    it('Given: COMPLETED sale When: cancelling Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('COMPLETED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.cancel()).toThrow('Sale cannot be cancelled');
    });

    it('Given: CANCELLED sale When: cancelling again Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CANCELLED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.cancel()).toThrow('Sale cannot be cancelled');
    });
  });

  describe('full workflow: DRAFT -> CONFIRMED -> PICKING -> SHIPPED -> COMPLETED', () => {
    it('Given: new sale When: following full workflow Then: all transitions succeed', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      sale.addLine(createLine('org-123'));

      // Confirm
      sale.confirm('mov-001', 'user-001');
      expect(sale.status.isConfirmed()).toBe(true);

      // Start picking
      sale.startPicking('user-002');
      expect(sale.status.isPicking()).toBe(true);

      // Ship
      sale.ship('TRACK-100', 'DHL', 'Fragile', 'user-003');
      expect(sale.status.isShipped()).toBe(true);

      // Complete
      sale.complete('user-004');
      expect(sale.status.isCompleted()).toBe(true);

      // Verify all timestamps are set
      expect(sale.confirmedAt).toBeDefined();
      expect(sale.pickedAt).toBeDefined();
      expect(sale.shippedAt).toBeDefined();
      expect(sale.completedAt).toBeDefined();
    });
  });

  describe('update', () => {
    it('Given: DRAFT sale When: updating note Then: should update successfully', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act
      const updated = sale.update({ note: 'Updated note' });

      // Assert
      expect(updated.note).toBe('Updated note');
      expect(updated.customerReference).toBe('CUST-001'); // unchanged
    });

    it('Given: DRAFT sale When: updating customerReference Then: should update successfully', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act
      const updated = sale.update({ customerReference: 'CUST-NEW' });

      // Assert
      expect(updated.customerReference).toBe('CUST-NEW');
    });

    it('Given: CONFIRMED sale When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CONFIRMED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.update({ note: 'fail' })).toThrow(
        'Cannot update sale when status is CONFIRMED or CANCELLED'
      );
    });

    it('Given: CANCELLED sale When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: SaleStatus.create('CANCELLED') };
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Act & Assert
      expect(() => sale.update({ note: 'fail' })).toThrow(
        'Cannot update sale when status is CONFIRMED or CANCELLED'
      );
    });
  });

  describe('getTotalAmount', () => {
    it('Given: sale with lines When: getting total amount Then: should sum correctly', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      sale.addLine(createLine('org-123')); // qty 5, price 200 = 1000

      // Act
      const total = sale.getTotalAmount();

      // Assert
      expect(total.getAmount()).toBe(1000);
      expect(total.getCurrency()).toBe('COP');
    });

    it('Given: sale with no lines When: getting total amount Then: should return zero COP', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');

      // Act
      const total = sale.getTotalAmount();

      // Assert
      expect(total.getAmount()).toBe(0);
      expect(total.getCurrency()).toBe('COP');
    });
  });

  describe('getLines', () => {
    it('Given: sale with lines When: getting lines Then: should return defensive copy', () => {
      // Arrange
      const sale = Sale.create(defaultProps(), 'org-123');
      sale.addLine(createLine('org-123'));

      // Act
      const lines = sale.getLines();
      const linesBefore = lines.length;
      lines.pop();

      // Assert
      expect(sale.getLines()).toHaveLength(linesBefore);
    });
  });

  describe('properties', () => {
    it('Given: sale with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        status: SaleStatus.create('SHIPPED'),
        confirmedAt: new Date('2026-02-01'),
        confirmedBy: 'user-001',
        pickedAt: new Date('2026-02-02'),
        pickedBy: 'user-002',
        shippedAt: new Date('2026-02-03'),
        shippedBy: 'user-003',
        trackingNumber: 'TRACK-123',
        shippingCarrier: 'UPS',
        shippingNotes: 'Leave at door',
        movementId: 'mov-001',
      };

      // Act
      const sale = Sale.reconstitute(props, 'sale-001', 'org-123');

      // Assert
      expect(sale.confirmedAt).toEqual(new Date('2026-02-01'));
      expect(sale.confirmedBy).toBe('user-001');
      expect(sale.pickedAt).toEqual(new Date('2026-02-02'));
      expect(sale.pickedBy).toBe('user-002');
      expect(sale.shippedAt).toEqual(new Date('2026-02-03'));
      expect(sale.shippedBy).toBe('user-003');
      expect(sale.trackingNumber).toBe('TRACK-123');
      expect(sale.shippingCarrier).toBe('UPS');
      expect(sale.shippingNotes).toBe('Leave at door');
      expect(sale.movementId).toBe('mov-001');
    });
  });
});
