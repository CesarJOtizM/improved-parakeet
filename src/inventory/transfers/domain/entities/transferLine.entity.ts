import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { Entity } from '@shared/domain/base/entity.base';

export interface TransferLineProps {
  productId: string;
  quantity: Quantity;
  fromLocationId?: string;
  toLocationId?: string;
}

export class TransferLine extends Entity<TransferLineProps> {
  private constructor(props: TransferLineProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: TransferLineProps, orgId: string): TransferLine {
    return new TransferLine(props, undefined, orgId);
  }

  public static reconstitute(props: TransferLineProps, id: string, orgId: string): TransferLine {
    return new TransferLine(props, id, orgId);
  }

  public update(props: Partial<TransferLineProps>): void {
    if (props.quantity !== undefined) this.props.quantity = props.quantity;
    if (props.fromLocationId !== undefined) this.props.fromLocationId = props.fromLocationId;
    if (props.toLocationId !== undefined) this.props.toLocationId = props.toLocationId;

    this.updateTimestamp();
  }

  public setFromLocation(locationId: string): void {
    this.props.fromLocationId = locationId;
    this.updateTimestamp();
  }

  public setToLocation(locationId: string): void {
    this.props.toLocationId = locationId;
    this.updateTimestamp();
  }

  public hasFromLocation(): boolean {
    return !!this.props.fromLocationId;
  }

  public hasToLocation(): boolean {
    return !!this.props.toLocationId;
  }

  // Getters
  get productId(): string {
    return this.props.productId;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get fromLocationId(): string | undefined {
    return this.props.fromLocationId;
  }

  get toLocationId(): string | undefined {
    return this.props.toLocationId;
  }
}
