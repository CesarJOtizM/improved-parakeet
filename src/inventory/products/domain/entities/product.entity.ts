import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

import { ProductCreatedEvent } from '../events/productCreated.event';
import { ProductUpdatedEvent } from '../events/productUpdated.event';
import { CostMethod } from '../valueObjects/costMethod.valueObject';
import { ProductStatus } from '../valueObjects/productStatus.valueObject';

export interface ProductProps {
  sku: string;
  name: string;
  description?: string;
  unitId: string;
  barcode?: string;
  brand?: string;
  model?: string;
  status: ProductStatus;
  costMethod: CostMethod;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ProductProps, orgId: string): Product {
    const product = new Product(props, undefined, orgId);
    product.addDomainEvent(new ProductCreatedEvent(product));
    return product;
  }

  public static reconstitute(props: ProductProps, id: string, orgId: string): Product {
    return new Product(props, id, orgId);
  }

  public update(props: Partial<ProductProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.description !== undefined) this.props.description = props.description;
    if (props.barcode !== undefined) this.props.barcode = props.barcode;
    if (props.brand !== undefined) this.props.brand = props.brand;
    if (props.model !== undefined) this.props.model = props.model;
    if (props.status !== undefined) this.props.status = props.status;
    if (props.costMethod !== undefined) this.props.costMethod = props.costMethod;

    this.updateTimestamp();
    this.addDomainEvent(new ProductUpdatedEvent(this));
  }

  public activate(): void {
    this.props.status = ProductStatus.create('ACTIVE');
    this.updateTimestamp();
    this.addDomainEvent(new ProductUpdatedEvent(this));
  }

  public deactivate(): void {
    this.props.status = ProductStatus.create('INACTIVE');
    this.updateTimestamp();
    this.addDomainEvent(new ProductUpdatedEvent(this));
  }

  // Getters
  get sku(): string {
    return this.props.sku;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get unitId(): string {
    return this.props.unitId;
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

  get isActive(): boolean {
    return this.props.status.getValue() === 'ACTIVE';
  }
}
