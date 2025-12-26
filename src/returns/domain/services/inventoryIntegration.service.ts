import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Return } from '@returns/domain/entities/return.entity';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export class InventoryIntegrationService {
  /**
   * Generates a Movement entity from a confirmed customer return (IN movement)
   */
  public static generateMovementFromCustomerReturn(returnEntity: Return): Movement {
    if (!returnEntity.status.isConfirmed()) {
      throw new Error('Can only generate movement from confirmed return');
    }

    if (!returnEntity.type.isCustomerReturn()) {
      throw new Error('Can only generate IN movement from customer return');
    }

    // Create movement with type IN and reason RETURN_CUSTOMER
    const movement = Movement.create(
      {
        type: MovementType.create('IN'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: returnEntity.warehouseId,
        reference: returnEntity.returnNumber.getValue(),
        reason: 'RETURN_CUSTOMER',
        note: returnEntity.note || `Customer return ${returnEntity.returnNumber.getValue()}`,
        createdBy: returnEntity.createdBy,
      },
      returnEntity.orgId
    );

    // Add lines from return to movement
    for (const returnLine of returnEntity.getLines()) {
      // Get precision from quantity (default to 6 for movements)
      const precision = returnLine.quantity.getPrecision();
      const quantity = Quantity.create(returnLine.quantity.getNumericValue(), precision);

      // Create movement line (no unitCost for returns, just quantity)
      const movementLine = MovementLine.create(
        {
          productId: returnLine.productId,
          locationId: returnLine.locationId,
          quantity,
          currency: returnLine.currency,
          // No unitCost for returns - cost is handled by stock average cost
        },
        returnEntity.orgId
      );

      movement.addLine(movementLine);
    }

    return movement;
  }

  /**
   * Generates a Movement entity from a confirmed supplier return (OUT movement)
   */
  public static generateMovementFromSupplierReturn(returnEntity: Return): Movement {
    if (!returnEntity.status.isConfirmed()) {
      throw new Error('Can only generate movement from confirmed return');
    }

    if (!returnEntity.type.isSupplierReturn()) {
      throw new Error('Can only generate OUT movement from supplier return');
    }

    // Create movement with type OUT and reason RETURN_SUPPLIER
    const movement = Movement.create(
      {
        type: MovementType.create('OUT'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: returnEntity.warehouseId,
        reference: returnEntity.returnNumber.getValue(),
        reason: 'RETURN_SUPPLIER',
        note: returnEntity.note || `Supplier return ${returnEntity.returnNumber.getValue()}`,
        createdBy: returnEntity.createdBy,
      },
      returnEntity.orgId
    );

    // Add lines from return to movement
    for (const returnLine of returnEntity.getLines()) {
      // Get precision from quantity (default to 6 for movements)
      const precision = returnLine.quantity.getPrecision();
      const quantity = Quantity.create(returnLine.quantity.getNumericValue(), precision);

      // Create movement line (no unitCost for returns, just quantity)
      const movementLine = MovementLine.create(
        {
          productId: returnLine.productId,
          locationId: returnLine.locationId,
          quantity,
          currency: returnLine.currency,
          // No unitCost for returns - cost is handled by stock average cost
        },
        returnEntity.orgId
      );

      movement.addLine(movementLine);
    }

    return movement;
  }
}
