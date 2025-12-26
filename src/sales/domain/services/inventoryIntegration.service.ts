import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Sale } from '@sale/domain/entities/sale.entity';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export class InventoryIntegrationService {
  /**
   * Generates a Movement entity from a confirmed Sale
   */
  public static generateMovementFromSale(sale: Sale): Movement {
    if (!sale.status.isConfirmed()) {
      throw new Error('Can only generate movement from confirmed sale');
    }

    // Create movement with type OUT and reason SALE
    const movement = Movement.create(
      {
        type: MovementType.create('OUT'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: sale.warehouseId,
        reference: sale.saleNumber.getValue(),
        reason: 'SALE',
        note: sale.note || `Sale ${sale.saleNumber.getValue()}`,
        createdBy: sale.createdBy,
      },
      sale.orgId
    );

    // Add lines from sale to movement
    for (const saleLine of sale.getLines()) {
      // Get precision from quantity (default to 6 for movements)
      const precision = saleLine.quantity.getPrecision();
      const quantity = Quantity.create(saleLine.quantity.getNumericValue(), precision);

      // Create movement line (no unitCost for sales, just quantity)
      const movementLine = MovementLine.create(
        {
          productId: saleLine.productId,
          locationId: saleLine.locationId,
          quantity,
          currency: saleLine.salePrice.getCurrency(),
          // No unitCost for sales - cost is handled by stock average cost
        },
        sale.orgId
      );

      movement.addLine(movementLine);
    }

    return movement;
  }
}
