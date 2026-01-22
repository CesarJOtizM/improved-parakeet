import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Entity } from '@shared/domain/base/entity.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export interface ISaleLineProps {
  productId: string;
  locationId?: string; // Optional for MVP - warehouse is the location
  quantity: Quantity;
  salePrice: SalePrice;
  extra?: Record<string, unknown>;
}

export class SaleLine extends Entity<ISaleLineProps> {
  private constructor(props: ISaleLineProps, id?: string, orgId?: string) {
    super(props, id, orgId);
    this.validate(props);
  }

  public static create(props: ISaleLineProps, orgId: string): SaleLine {
    return new SaleLine(props, undefined, orgId);
  }

  public static reconstitute(props: ISaleLineProps, id: string, orgId: string): SaleLine {
    return new SaleLine(props, id, orgId);
  }

  private validate(props: ISaleLineProps): void {
    // Quantity must be positive
    if (!props.quantity.isPositive()) {
      throw new Error('Quantity must be positive');
    }

    // SalePrice is required and must be positive
    if (!props.salePrice) {
      throw new Error('Sale price is required');
    }

    // ProductId is required
    if (!props.productId || props.productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    // LocationId validation - only if provided (optional for MVP)
    if (props.locationId !== undefined && props.locationId.trim().length === 0) {
      throw new Error('Location ID cannot be empty if provided');
    }
  }

  public update(props: Partial<ISaleLineProps>): void {
    // Create a temporary props object to validate
    const updatedProps: ISaleLineProps = {
      ...this.props,
      ...props,
    };

    // Validate before updating
    this.validate(updatedProps);

    if (props.quantity !== undefined) this.props.quantity = props.quantity;
    if (props.salePrice !== undefined) this.props.salePrice = props.salePrice;
    if (props.extra !== undefined) this.props.extra = props.extra;

    this.updateTimestamp();
  }

  public getTotalPrice(): Money {
    return this.props.salePrice.multiply(this.props.quantity.getNumericValue()).getValue();
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

  get salePrice(): SalePrice {
    return this.props.salePrice;
  }

  get extra(): Record<string, unknown> | undefined {
    return this.props.extra;
  }
}
