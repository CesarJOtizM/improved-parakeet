import { IMovementProps, Movement } from '@movement/domain/entities/movement.entity';
import { IMovementLineProps, MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

/**
 * Movement line DTO for creating movements (input)
 */
export interface IMovementLineCreateInput {
  productId: string;
  locationId: string;
  quantity: number;
  unitCost?: number;
  currency?: string;
  extra?: Record<string, unknown>;
}

/**
 * Movement DTO for creating movements (input)
 */
export interface IMovementCreateInput {
  type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  lines: IMovementLineCreateInput[];
  createdBy: string;
}

/**
 * Movement line DTO for response (output)
 */
export interface IMovementLineResponseData {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unitCost?: number;
  currency: string;
  extra?: Record<string, unknown>;
}

/**
 * Movement DTO for response (output)
 */
export interface IMovementResponseData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  postedAt?: Date;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  lines: IMovementLineResponseData[];
}

/**
 * MovementMapper - Handles bidirectional conversion between DTOs and domain entities
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value object creation for DTO→Domain and value extraction for Domain→DTO.
 */
export class MovementMapper {
  /**
   * Converts a DTO input to domain entity props
   * Creates all necessary value objects (MovementType, MovementStatus, etc.)
   *
   * @param input - The DTO input for creating a movement
   * @returns IMovementProps ready for Movement.create()
   */
  public static toDomainProps(input: IMovementCreateInput): IMovementProps {
    const type = MovementType.create(input.type);
    const status = MovementStatus.create('DRAFT');

    return {
      type,
      status,
      warehouseId: input.warehouseId,
      reference: input.reference,
      reason: input.reason,
      note: input.note,
      createdBy: input.createdBy,
    };
  }

  /**
   * Converts a line DTO input to domain entity props
   *
   * @param input - The DTO input for creating a movement line
   * @param precision - The decimal precision for quantity (from product unit)
   * @returns IMovementLineProps ready for MovementLine.create()
   */
  public static toLineDomainProps(
    input: IMovementLineCreateInput,
    precision: number
  ): IMovementLineProps {
    const quantity = Quantity.create(input.quantity, precision);
    const currency = input.currency || 'COP';
    const unitCost = input.unitCost ? Money.create(input.unitCost, currency, 2) : undefined;

    return {
      productId: input.productId,
      locationId: input.locationId,
      quantity,
      unitCost,
      currency,
      extra: input.extra,
    };
  }

  /**
   * Creates a MovementLine entity from input
   *
   * @param input - The DTO input for creating a movement line
   * @param precision - The decimal precision for quantity (from product unit)
   * @param orgId - The organization ID
   * @returns MovementLine entity
   */
  public static createLineEntity(
    input: IMovementLineCreateInput,
    precision: number,
    orgId: string
  ): MovementLine {
    const props = MovementMapper.toLineDomainProps(input, precision);
    return MovementLine.create(props, orgId);
  }

  /**
   * Converts a MovementLine domain entity to a response DTO
   *
   * @param line - The MovementLine domain entity
   * @returns IMovementLineResponseData for API responses
   */
  public static lineToResponseData(line: MovementLine): IMovementLineResponseData {
    return {
      id: line.id,
      productId: line.productId,
      locationId: line.locationId,
      quantity: line.quantity.getNumericValue(),
      unitCost: line.unitCost?.getAmount(),
      currency: line.currency,
      extra: line.extra,
    };
  }

  /**
   * Converts a Movement domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param movement - The Movement domain entity
   * @returns IMovementResponseData for API responses
   */
  public static toResponseData(movement: Movement): IMovementResponseData {
    return {
      id: movement.id,
      type: movement.type.getValue(),
      status: movement.status.getValue(),
      warehouseId: movement.warehouseId,
      reference: movement.reference,
      reason: movement.reason,
      note: movement.note,
      postedAt: movement.postedAt,
      createdBy: movement.createdBy,
      orgId: movement.orgId!,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      lines: movement.getLines().map(line => MovementMapper.lineToResponseData(line)),
    };
  }

  /**
   * Converts an array of Movement domain entities to response DTOs
   *
   * @param movements - Array of Movement domain entities
   * @returns Array of IMovementResponseData for API responses
   */
  public static toResponseDataList(movements: Movement[]): IMovementResponseData[] {
    return movements.map(movement => MovementMapper.toResponseData(movement));
  }
}
