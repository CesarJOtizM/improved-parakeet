import { Money, Quantity } from '@inventory/stock';
import { Entity } from '@shared/domain/base/entity.base';

export interface IMovementLineProps {
  productId: string;
  locationId?: string; // Optional for MVP - warehouse is the location
  quantity: Quantity;
  unitCost?: Money;
  currency: string;
  extra?: Record<string, unknown>;
}

export class MovementLine extends Entity<IMovementLineProps> {
  private constructor(props: IMovementLineProps, id?: string, orgId?: string) {
    super(props, id, orgId);
    this.validate(props);
  }

  public static create(props: IMovementLineProps, orgId: string): MovementLine {
    return new MovementLine(props, undefined, orgId);
  }

  public static reconstitute(props: IMovementLineProps, id: string, orgId: string): MovementLine {
    return new MovementLine(props, id, orgId);
  }

  private validate(props: IMovementLineProps): void {
    // Quantity must be positive
    if (!props.quantity.isPositive()) {
      throw new Error('Quantity must be positive');
    }

    // UnitCost must be positive if provided
    if (props.unitCost && !props.unitCost.isPositive()) {
      throw new Error('Unit cost must be positive if provided');
    }

    // Currency must match unitCost currency if unitCost is provided
    if (props.unitCost && props.unitCost.getCurrency() !== props.currency) {
      throw new Error('Currency must match unit cost currency');
    }

    // Currency is required
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
  }

  public update(props: Partial<IMovementLineProps>): void {
    // Create a temporary props object to validate
    const updatedProps: IMovementLineProps = {
      ...this.props,
      ...props,
    };

    // Validate before updating
    this.validate(updatedProps);

    if (props.quantity !== undefined) this.props.quantity = props.quantity;
    if (props.unitCost !== undefined) this.props.unitCost = props.unitCost;
    if (props.currency !== undefined) this.props.currency = props.currency;
    if (props.extra !== undefined) this.props.extra = props.extra;

    this.updateTimestamp();
  }

  public getTotalCost(): Money | undefined {
    if (!this.props.unitCost) return undefined;
    return this.props.unitCost.multiply(this.props.quantity.getNumericValue());
  }

  public hasCost(): boolean {
    return !!this.props.unitCost;
  }

  // Getters
  get productId(): string {
    return this.props.productId;
  }

  get locationId(): string | undefined {
    return this.props.locationId;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get unitCost(): Money | undefined {
    return this.props.unitCost;
  }

  get currency(): string {
    return this.props.currency;
  }

  get extra(): Record<string, unknown> | undefined {
    return this.props.extra;
  }
}
