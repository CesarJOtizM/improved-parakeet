import {
  IMovementCreateInput,
  IMovementLineCreateInput,
  MovementMapper,
} from '@inventory/movements/mappers/movement.mapper';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('MovementMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid CreateMovementDto When: converting to domain props Then: should create correct value objects', () => {
      // Arrange
      const input: IMovementCreateInput = {
        type: 'IN',
        warehouseId: 'warehouse-123',
        reference: 'REF-001',
        reason: 'PURCHASE',
        note: 'Initial stock entry',
        lines: [],
        createdBy: 'user-123',
      };

      // Act
      const props = MovementMapper.toDomainProps(input);

      // Assert
      expect(props.type).toBeInstanceOf(MovementType);
      expect(props.type.getValue()).toBe('IN');
      expect(props.status).toBeInstanceOf(MovementStatus);
      expect(props.status.getValue()).toBe('DRAFT');
      expect(props.warehouseId).toBe('warehouse-123');
      expect(props.reference).toBe('REF-001');
      expect(props.reason).toBe('PURCHASE');
      expect(props.note).toBe('Initial stock entry');
      expect(props.createdBy).toBe('user-123');
    });

    it('Given: OUT movement type When: converting to domain props Then: should create OUT type', () => {
      // Arrange
      const input: IMovementCreateInput = {
        type: 'OUT',
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: 'user-123',
      };

      // Act
      const props = MovementMapper.toDomainProps(input);

      // Assert
      expect(props.type.getValue()).toBe('OUT');
    });

    it('Given: minimal CreateMovementDto When: converting to domain props Then: should handle undefined optional fields', () => {
      // Arrange
      const input: IMovementCreateInput = {
        type: 'ADJUST_IN',
        warehouseId: 'warehouse-456',
        lines: [],
        createdBy: 'user-456',
      };

      // Act
      const props = MovementMapper.toDomainProps(input);

      // Assert
      expect(props.reference).toBeUndefined();
      expect(props.reason).toBeUndefined();
      expect(props.note).toBeUndefined();
    });
  });

  describe('toLineDomainProps', () => {
    it('Given: valid line input with unit cost When: converting to line props Then: should create correct value objects', () => {
      // Arrange
      const input: IMovementLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 10,
        unitCost: 100.5,
        currency: 'COP',
        extra: { batch: 'BATCH-001' },
      };

      // Act
      const props = MovementMapper.toLineDomainProps(input, 2);

      // Assert
      expect(props.quantity).toBeInstanceOf(Quantity);
      expect(props.quantity.getNumericValue()).toBe(10);
      expect(props.unitCost).toBeInstanceOf(Money);
      expect(props.unitCost?.getAmount()).toBe(100.5);
      expect(props.currency).toBe('COP');
      expect(props.productId).toBe('product-123');
      expect(props.locationId).toBe('location-123');
      expect(props.extra).toEqual({ batch: 'BATCH-001' });
    });

    it('Given: line input without unit cost When: converting to line props Then: should have undefined unitCost', () => {
      // Arrange
      const input: IMovementLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
      };

      // Act
      const props = MovementMapper.toLineDomainProps(input, 0);

      // Assert
      expect(props.unitCost).toBeUndefined();
      expect(props.currency).toBe('COP'); // Default
    });

    it('Given: line input without currency When: converting to line props Then: should use default COP', () => {
      // Arrange
      const input: IMovementLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
        unitCost: 50,
      };

      // Act
      const props = MovementMapper.toLineDomainProps(input, 0);

      // Assert
      expect(props.currency).toBe('COP');
      expect(props.unitCost?.getCurrency()).toBe('COP');
    });
  });

  describe('createLineEntity', () => {
    it('Given: valid line input When: creating line entity Then: should return MovementLine', () => {
      // Arrange
      const input: IMovementLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 10,
        unitCost: 100,
        currency: 'COP',
      };

      // Act
      const line = MovementMapper.createLineEntity(input, 2, 'org-123');

      // Assert
      expect(line).toBeInstanceOf(MovementLine);
      expect(line.productId).toBe('product-123');
      expect(line.locationId).toBe('location-123');
      expect(line.quantity.getNumericValue()).toBe(10);
    });
  });

  describe('lineToResponseData', () => {
    it('Given: MovementLine entity When: converting to response DTO Then: should extract all values', () => {
      // Arrange
      const props = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(10, 2),
        unitCost: Money.create(100.5, 'COP', 2),
        currency: 'COP',
        extra: { batch: 'BATCH-001' },
      };
      const line = MovementLine.create(props, 'org-123');

      // Act
      const dto = MovementMapper.lineToResponseData(line);

      // Assert
      expect(dto.id).toBe(line.id);
      expect(dto.productId).toBe('product-123');
      expect(dto.locationId).toBe('location-123');
      expect(dto.quantity).toBe(10);
      expect(dto.unitCost).toBe(100.5);
      expect(dto.currency).toBe('COP');
      expect(dto.extra).toEqual({ batch: 'BATCH-001' });
    });

    it('Given: MovementLine without unit cost When: converting to response DTO Then: should have undefined unitCost', () => {
      // Arrange
      const props = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(5, 0),
        currency: 'COP',
      };
      const line = MovementLine.create(props, 'org-123');

      // Act
      const dto = MovementMapper.lineToResponseData(line);

      // Assert
      expect(dto.unitCost).toBeUndefined();
    });
  });

  describe('toResponseData', () => {
    const createTestMovement = (): Movement => {
      const props = {
        type: MovementType.create('IN'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: 'warehouse-123',
        reference: 'REF-001',
        reason: 'PURCHASE',
        note: 'Test note',
        createdBy: 'user-123',
      };
      const movement = Movement.create(props, 'org-123');

      // Add a line
      const lineProps = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(10, 2),
        unitCost: Money.create(100, 'COP', 2),
        currency: 'COP',
      };
      const line = MovementLine.create(lineProps, 'org-123');
      movement.addLine(line);

      return movement;
    };

    it('Given: Movement entity with lines When: converting to response DTO Then: should include all data', () => {
      // Arrange
      const movement = createTestMovement();

      // Act
      const dto = MovementMapper.toResponseData(movement);

      // Assert
      expect(dto.id).toBe(movement.id);
      expect(dto.type).toBe('IN');
      expect(dto.status).toBe('DRAFT');
      expect(dto.warehouseId).toBe('warehouse-123');
      expect(dto.reference).toBe('REF-001');
      expect(dto.reason).toBe('PURCHASE');
      expect(dto.note).toBe('Test note');
      expect(dto.createdBy).toBe('user-123');
      expect(dto.orgId).toBe('org-123');
      expect(dto.lines).toHaveLength(1);
      expect(dto.lines[0].productId).toBe('product-123');
      expect(dto.lines[0].quantity).toBe(10);
    });

    it('Given: Movement entity without optional fields When: converting to response DTO Then: should handle undefined', () => {
      // Arrange
      const props = {
        type: MovementType.create('OUT'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: 'warehouse-456',
        createdBy: 'user-456',
      };
      const movement = Movement.create(props, 'org-456');

      // Act
      const dto = MovementMapper.toResponseData(movement);

      // Assert
      expect(dto.reference).toBeUndefined();
      expect(dto.reason).toBeUndefined();
      expect(dto.note).toBeUndefined();
      expect(dto.postedAt).toBeUndefined();
      expect(dto.lines).toHaveLength(0);
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of Movement entities When: converting to response DTOs Then: should convert all movements', () => {
      // Arrange
      const props1 = {
        type: MovementType.create('IN'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: 'warehouse-123',
        createdBy: 'user-123',
      };
      const props2 = {
        type: MovementType.create('OUT'),
        status: MovementStatus.create('POSTED'),
        warehouseId: 'warehouse-456',
        createdBy: 'user-456',
      };
      const movements = [Movement.create(props1, 'org-123'), Movement.create(props2, 'org-123')];

      // Act
      const dtos = MovementMapper.toResponseDataList(movements);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].type).toBe('IN');
      expect(dtos[1].type).toBe('OUT');
    });

    it('Given: empty array of movements When: converting to response DTOs Then: should return empty array', () => {
      // Arrange
      const movements: Movement[] = [];

      // Act
      const dtos = MovementMapper.toResponseDataList(movements);

      // Assert
      expect(dtos).toHaveLength(0);
    });
  });
});
