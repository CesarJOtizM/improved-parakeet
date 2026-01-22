import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Entity } from '@shared/domain/base/entity.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export interface IReturnLineProps {
  productId: string;
  locationId?: string; // Optional for MVP - warehouse is the location
  quantity: Quantity;
  originalSalePrice?: SalePrice; // For customer returns
  originalUnitCost?: Money; // For supplier returns
  currency: string;
  extra?: Record<string, unknown>;
}

export class ReturnLine extends Entity<IReturnLineProps> {
  private constructor(props: IReturnLineProps, id?: string, orgId?: string) {
    super(props, id, orgId);
    this.validate(props);
  }

  public static create(props: IReturnLineProps, orgId: string, returnType: ReturnType): ReturnLine {
    // Validate return type specific fields
    if (returnType.isCustomerReturn() && !props.originalSalePrice) {
      throw new Error('Original sale price is required for customer returns');
    }
    if (returnType.isSupplierReturn() && !props.originalUnitCost) {
      throw new Error('Original unit cost is required for supplier returns');
    }
    return new ReturnLine(props, undefined, orgId);
  }

  public static reconstitute(props: IReturnLineProps, id: string, orgId: string): ReturnLine {
    return new ReturnLine(props, id, orgId);
  }

  private validate(props: IReturnLineProps): void {
    // Quantity must be positive
    if (!props.quantity.isPositive()) {
      throw new Error('Quantity must be positive');
    }

    // ProductId is required
    if (!props.productId || props.productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    // LocationId validation - only if provided (optional for MVP)
    if (props.locationId !== undefined && props.locationId.trim().length === 0) {
      throw new Error('Location ID cannot be empty if provided');
    }

    // Currency is required
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    // Validate originalSalePrice if provided
    if (props.originalSalePrice) {
      if (!props.originalSalePrice.getValue().isPositive()) {
        throw new Error('Original sale price must be positive');
      }
    }

    // Validate originalUnitCost if provided
    if (props.originalUnitCost) {
      if (!props.originalUnitCost.isPositive()) {
        throw new Error('Original unit cost must be positive');
      }
    }
  }

  public update(props: Partial<IReturnLineProps>): void {
    // Create a temporary props object to validate
    const updatedProps: IReturnLineProps = {
      ...this.props,
      ...props,
    };

    // Validate before updating
    this.validate(updatedProps);

    if (props.quantity !== undefined) this.props.quantity = props.quantity;
    if (props.originalSalePrice !== undefined)
      this.props.originalSalePrice = props.originalSalePrice;
    if (props.originalUnitCost !== undefined) this.props.originalUnitCost = props.originalUnitCost;
    if (props.extra !== undefined) this.props.extra = props.extra;

    this.updateTimestamp();
  }

  public getTotalPrice(): Money | null {
    if (this.props.originalSalePrice) {
      return this.props.originalSalePrice
        .multiply(this.props.quantity.getNumericValue())
        .getValue();
    }
    if (this.props.originalUnitCost) {
      return this.props.originalUnitCost.multiply(this.props.quantity.getNumericValue());
    }
    return null;
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

  get originalSalePrice(): SalePrice | undefined {
    return this.props.originalSalePrice;
  }

  get originalUnitCost(): Money | undefined {
    return this.props.originalUnitCost;
  }

  get currency(): string {
    return this.props.currency;
  }

  get extra(): Record<string, unknown> | undefined {
    return this.props.extra;
  }
}
