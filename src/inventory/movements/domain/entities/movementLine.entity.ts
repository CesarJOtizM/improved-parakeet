import { Money, Quantity } from '@inventory/stock';
import { Entity } from '@shared/domain/base/entity.base';

export interface IMovementLineProps {
  productId: string;
  locationId: string;
  quantity: Quantity;
  unitCost?: Money;
  currency: string;
  extra?: Record<string, unknown>;
}

export class MovementLine extends Entity<IMovementLineProps> {
  private constructor(props: IMovementLineProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IMovementLineProps, orgId: string): MovementLine {
    return new MovementLine(props, undefined, orgId);
  }

  public static reconstitute(props: IMovementLineProps, id: string, orgId: string): MovementLine {
    return new MovementLine(props, id, orgId);
  }

  public update(props: Partial<IMovementLineProps>): void {
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

  get locationId(): string {
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
