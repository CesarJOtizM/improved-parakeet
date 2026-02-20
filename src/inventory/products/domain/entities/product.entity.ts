import { ProductCreatedEvent } from '@product/domain/events/productCreated.event';
import { ProductUpdatedEvent } from '@product/domain/events/productUpdated.event';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { Price } from '@product/domain/valueObjects/price.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface IProductProps {
  sku: SKU;
  name: ProductName;
  description?: string;
  categories?: { id: string; name: string }[];
  unit: UnitValueObject;
  barcode?: string;
  brand?: string;
  model?: string;
  price?: Price;
  status: ProductStatus;
  costMethod: CostMethod;
}

export class Product extends AggregateRoot<IProductProps> {
  private constructor(props: IProductProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IProductProps, orgId: string): Product {
    const product = new Product(props, undefined, orgId);
    product.addDomainEvent(new ProductCreatedEvent(product));
    return product;
  }

  public static reconstitute(props: IProductProps, id: string, orgId: string): Product {
    return new Product(props, id, orgId);
  }

  /**
   * Checks if the product can change to the given status
   * DISCONTINUED status is final and cannot be changed
   */
  public canChangeStatus(_newStatus: string): boolean {
    // DISCONTINUED status is final
    if (this.props.status.getValue() === 'DISCONTINUED') {
      return false;
    }
    return true;
  }

  /**
   * Checks if the cost method can be changed
   * This is a pure check - async validation (e.g., checking for posted movements)
   * should be done in the use case before calling this method
   */
  public canChangeCostMethod(): boolean {
    // Pure check - always returns true
    // Async validation (e.g., checking for posted movements) should be done in use case
    return true;
  }

  /**
   * Validates that the product is active for operations
   * Throws an error if the product is not active
   */
  public validateActiveForOperation(): void {
    if (!this.isActive) {
      throw new Error('Product must be active to perform this operation');
    }
    if (!this.props.status.isActive()) {
      throw new Error('Product status must be ACTIVE to perform this operation');
    }
  }

  public update(props: Partial<IProductProps>): Product {
    // Validate status change if status is being updated
    if (props.status !== undefined) {
      const newStatus = props.status.getValue();
      if (!this.canChangeStatus(newStatus)) {
        throw new Error('Cannot change status of a discontinued product');
      }
    }

    // Create new props with updated values
    const updatedProps: IProductProps = {
      sku: props.sku !== undefined ? props.sku : this.props.sku,
      name: props.name !== undefined ? props.name : this.props.name,
      description: props.description !== undefined ? props.description : this.props.description,
      categories: props.categories !== undefined ? props.categories : this.props.categories,
      unit: props.unit !== undefined ? props.unit : this.props.unit,
      barcode: props.barcode !== undefined ? props.barcode : this.props.barcode,
      brand: props.brand !== undefined ? props.brand : this.props.brand,
      model: props.model !== undefined ? props.model : this.props.model,
      price: props.price !== undefined ? props.price : this.props.price,
      status: props.status !== undefined ? props.status : this.props.status,
      costMethod: props.costMethod !== undefined ? props.costMethod : this.props.costMethod,
    };

    // Create new instance using reconstitute
    const updatedProduct = Product.reconstitute(updatedProps, this.id, this.orgId!);
    updatedProduct.addDomainEvent(new ProductUpdatedEvent(updatedProduct));
    return updatedProduct;
  }

  public activate(): Product {
    if (!this.canChangeStatus('ACTIVE')) {
      throw new Error('Cannot change status of a discontinued product');
    }
    const updatedProps: IProductProps = {
      ...this.props,
      status: ProductStatus.create('ACTIVE'),
    };
    const activatedProduct = Product.reconstitute(updatedProps, this.id, this.orgId!);
    activatedProduct.addDomainEvent(new ProductUpdatedEvent(activatedProduct));
    return activatedProduct;
  }

  public deactivate(): Product {
    if (!this.canChangeStatus('INACTIVE')) {
      throw new Error('Cannot change status of a discontinued product');
    }
    const updatedProps: IProductProps = {
      ...this.props,
      status: ProductStatus.create('INACTIVE'),
    };
    const deactivatedProduct = Product.reconstitute(updatedProps, this.id, this.orgId!);
    deactivatedProduct.addDomainEvent(new ProductUpdatedEvent(deactivatedProduct));
    return deactivatedProduct;
  }

  // Getters
  get sku(): SKU {
    return this.props.sku;
  }

  get name(): ProductName {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get categories(): { id: string; name: string }[] {
    return this.props.categories ?? [];
  }

  get unit(): UnitValueObject {
    return this.props.unit;
  }

  get barcode(): string | undefined {
    return this.props.barcode;
  }

  get brand(): string | undefined {
    return this.props.brand;
  }

  get model(): string | undefined {
    return this.props.model;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get costMethod(): CostMethod {
    return this.props.costMethod;
  }

  get price(): Price | undefined {
    return this.props.price;
  }

  get isActive(): boolean {
    return this.props.status.getValue() === 'ACTIVE';
  }
}
