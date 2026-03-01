import { describe, expect, it } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('Movement', () => {
  const defaultProps = () => ({
    type: MovementType.create('IN'),
    status: MovementStatus.create('DRAFT'),
    warehouseId: 'wh-001',
    reference: 'REF-001',
    reason: 'Stock replenishment',
    note: 'Monthly restock',
    createdBy: 'user-001',
  });

  const createLine = (orgId: string = 'org-123'): MovementLine => {
    return MovementLine.create(
      {
        productId: 'prod-001',
        quantity: Quantity.create(10),
        unitCost: Money.create(100, 'COP', 2),
        currency: 'COP',
      },
      orgId
    );
  };

  describe('create', () => {
    it('Given: valid props When: creating movement Then: should create successfully', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const movement = Movement.create(props, 'org-123');

      // Assert
      expect(movement.type.getValue()).toBe('IN');
      expect(movement.status.isDraft()).toBe(true);
      expect(movement.warehouseId).toBe('wh-001');
      expect(movement.reference).toBe('REF-001');
      expect(movement.reason).toBe('Stock replenishment');
      expect(movement.note).toBe('Monthly restock');
      expect(movement.createdBy).toBe('user-001');
      expect(movement.orgId).toBe('org-123');
    });

    it('Given: minimal props When: creating movement Then: should create with defaults', () => {
      // Arrange
      const props = {
        type: MovementType.create('OUT'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: 'wh-002',
        createdBy: 'user-002',
      };

      // Act
      const movement = Movement.create(props, 'org-123');

      // Assert
      expect(movement.type.getValue()).toBe('OUT');
      expect(movement.reference).toBeUndefined();
      expect(movement.reason).toBeUndefined();
      expect(movement.note).toBeUndefined();
      expect(movement.postedAt).toBeUndefined();
      expect(movement.postedBy).toBeUndefined();
    });

    it('Given: valid props When: creating movement Then: should have empty lines', () => {
      // Arrange & Act
      const movement = Movement.create(defaultProps(), 'org-123');

      // Assert
      expect(movement.getLines()).toHaveLength(0);
      expect(movement.getTotalQuantity()).toBe(0);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = defaultProps();
      const lines = [createLine('org-123')];

      // Act
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', lines);

      // Assert
      expect(movement.id).toBe('mov-001');
      expect(movement.orgId).toBe('org-123');
      expect(movement.getLines()).toHaveLength(1);
    });

    it('Given: existing data with timestamps When: reconstituting Then: should preserve timestamps', () => {
      // Arrange
      const props = defaultProps();
      const createdAt = new Date('2026-01-01');
      const updatedAt = new Date('2026-01-15');

      // Act
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [], createdAt, updatedAt);

      // Assert
      expect(movement.id).toBe('mov-001');
      expect(movement.createdAt).toEqual(createdAt);
    });

    it('Given: no lines provided When: reconstituting Then: should default to empty lines', () => {
      // Arrange & Act
      const movement = Movement.reconstitute(defaultProps(), 'mov-001', 'org-123');

      // Assert
      expect(movement.getLines()).toHaveLength(0);
    });
  });

  describe('addLine', () => {
    it('Given: DRAFT movement When: adding line Then: should add successfully', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      const line = createLine('org-123');

      // Act
      movement.addLine(line);

      // Assert
      expect(movement.getLines()).toHaveLength(1);
    });

    it('Given: POSTED movement When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);
      const newLine = createLine('org-123');

      // Act & Assert
      expect(() => movement.addLine(newLine)).toThrow(
        'Lines can only be added when movement status is DRAFT'
      );
    });

    it('Given: VOID movement When: adding line Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('VOID') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');
      const line = createLine('org-123');

      // Act & Assert
      expect(() => movement.addLine(line)).toThrow(
        'Lines can only be added when movement status is DRAFT'
      );
    });
  });

  describe('removeLine', () => {
    it('Given: DRAFT movement with lines When: removing existing line Then: should remove successfully', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      const line = createLine('org-123');
      movement.addLine(line);
      const lineId = movement.getLines()[0].id;

      // Act
      movement.removeLine(lineId);

      // Assert
      expect(movement.getLines()).toHaveLength(0);
    });

    it('Given: DRAFT movement When: removing non-existent line Then: should throw error', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => movement.removeLine('non-existent-id')).toThrow(
        'Line with id non-existent-id not found'
      );
    });

    it('Given: POSTED movement When: removing line Then: should throw error', () => {
      // Arrange
      const line = createLine('org-123');
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [line]);

      // Act & Assert
      expect(() => movement.removeLine(line.id)).toThrow(
        'Lines can only be removed when movement status is DRAFT'
      );
    });
  });

  describe('post', () => {
    it('Given: DRAFT movement with lines When: posting Then: should transition to POSTED', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123'));

      // Act
      const posted = movement.post('user-poster');

      // Assert
      expect(posted.status.isPosted()).toBe(true);
      expect(posted.postedAt).toBeDefined();
      expect(posted.postedBy).toBe('user-poster');
    });

    it('Given: DRAFT movement with lines When: posting without userId Then: should still post', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123'));

      // Act
      const posted = movement.post();

      // Assert
      expect(posted.status.isPosted()).toBe(true);
      expect(posted.postedBy).toBeUndefined();
    });

    it('Given: DRAFT movement without lines When: posting Then: should throw error', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => movement.post()).toThrow('Movement must have at least one line before posting');
    });

    it('Given: POSTED movement When: posting again Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);

      // Act & Assert
      expect(() => movement.post()).toThrow('Movement cannot be posted');
    });

    it('Given: VOID movement When: posting Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('VOID') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);

      // Act & Assert
      expect(() => movement.post()).toThrow('Movement cannot be posted');
    });

    it('Given: DRAFT movement When: posting Then: should preserve lines', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123'));

      // Act
      const posted = movement.post('user-001');

      // Assert
      expect(posted.getLines()).toHaveLength(1);
    });
  });

  describe('void', () => {
    it('Given: POSTED movement When: voiding Then: should transition to VOID', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);

      // Act
      const voided = movement.void();

      // Assert
      expect(voided.status.isVoid()).toBe(true);
    });

    it('Given: DRAFT movement When: voiding Then: should throw error', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => movement.void()).toThrow('Movement cannot be voided');
    });

    it('Given: VOID movement When: voiding again Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('VOID') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Act & Assert
      expect(() => movement.void()).toThrow('Movement cannot be voided');
    });

    it('Given: POSTED movement When: voiding Then: should preserve lines', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);

      // Act
      const voided = movement.void();

      // Assert
      expect(voided.getLines()).toHaveLength(1);
    });
  });

  describe('markAsReturned', () => {
    it('Given: POSTED movement When: marking as returned Then: should transition to RETURNED', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123', [createLine('org-123')]);

      // Act
      const returned = movement.markAsReturned('user-returner');

      // Assert
      expect(returned.status.isReturned()).toBe(true);
      expect(returned.returnedAt).toBeDefined();
      expect(returned.returnedBy).toBe('user-returner');
    });

    it('Given: DRAFT movement When: marking as returned Then: should throw error', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => movement.markAsReturned()).toThrow('Movement cannot be marked as returned');
    });
  });

  describe('update', () => {
    it('Given: DRAFT movement When: updating reference Then: should update successfully', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act
      const updated = movement.update({ reference: 'NEW-REF' });

      // Assert
      expect(updated.reference).toBe('NEW-REF');
    });

    it('Given: DRAFT movement When: updating note Then: should update successfully', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act
      const updated = movement.update({ note: 'Updated note' });

      // Assert
      expect(updated.note).toBe('Updated note');
      expect(updated.reference).toBe('REF-001'); // unchanged
    });

    it('Given: POSTED movement When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Act & Assert
      expect(() => movement.update({ note: 'fail' })).toThrow(
        'Cannot update movement when status is POSTED or VOID'
      );
    });

    it('Given: VOID movement When: updating Then: should throw error', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('VOID') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Act & Assert
      expect(() => movement.update({ note: 'fail' })).toThrow(
        'Cannot update movement when status is POSTED or VOID'
      );
    });
  });

  describe('canAddLine / canRemoveLine', () => {
    it('Given: DRAFT movement When: checking canAddLine Then: should return true', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(movement.canAddLine()).toBe(true);
    });

    it('Given: POSTED movement When: checking canAddLine Then: should return false', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Act & Assert
      expect(movement.canAddLine()).toBe(false);
    });

    it('Given: DRAFT movement When: checking canRemoveLine Then: should return true', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(movement.canRemoveLine()).toBe(true);
    });
  });

  describe('canPost', () => {
    it('Given: DRAFT movement with valid lines When: checking canPost Then: should return true', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123'));

      // Act & Assert
      expect(movement.canPost()).toBe(true);
    });

    it('Given: DRAFT movement without lines When: checking canPost Then: should return false', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(movement.canPost()).toBe(false);
    });
  });

  describe('canUpdate', () => {
    it('Given: DRAFT movement When: checking canUpdate Then: should return true', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(movement.canUpdate()).toBe(true);
    });

    it('Given: POSTED movement When: checking canUpdate Then: should return false', () => {
      // Arrange
      const props = { ...defaultProps(), status: MovementStatus.create('POSTED') };
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Act & Assert
      expect(movement.canUpdate()).toBe(false);
    });
  });

  describe('getTotalQuantity', () => {
    it('Given: movement with multiple lines When: getting total quantity Then: should sum correctly', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123')); // qty 10
      const line2 = MovementLine.create(
        {
          productId: 'prod-002',
          quantity: Quantity.create(5),
          unitCost: Money.create(50, 'COP', 2),
          currency: 'COP',
        },
        'org-123'
      );
      movement.addLine(line2);

      // Act
      const total = movement.getTotalQuantity();

      // Assert
      expect(total).toBe(15);
    });

    it('Given: movement with no lines When: getting total quantity Then: should return 0', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(movement.getTotalQuantity()).toBe(0);
    });
  });

  describe('getLines', () => {
    it('Given: movement with lines When: getting lines Then: should return defensive copy', () => {
      // Arrange
      const movement = Movement.create(defaultProps(), 'org-123');
      movement.addLine(createLine('org-123'));

      // Act
      const lines = movement.getLines();
      const linesBefore = lines.length;
      lines.pop(); // mutate the returned array

      // Assert
      expect(movement.getLines()).toHaveLength(linesBefore); // original unchanged
    });
  });

  describe('properties', () => {
    it('Given: movement with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const postedAt = new Date('2026-02-01');
      const props = {
        ...defaultProps(),
        status: MovementStatus.create('POSTED'),
        postedAt,
        postedBy: 'user-poster',
        returnedAt: new Date('2026-02-10'),
        returnedBy: 'user-returner',
      };

      // Act
      const movement = Movement.reconstitute(props, 'mov-001', 'org-123');

      // Assert
      expect(movement.postedAt).toEqual(postedAt);
      expect(movement.postedBy).toBe('user-poster');
      expect(movement.returnedAt).toBeDefined();
      expect(movement.returnedBy).toBe('user-returner');
    });
  });
});
