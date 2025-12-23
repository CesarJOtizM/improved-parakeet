import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { WarehouseCreatedEvent } from '@warehouse/domain/events/warehouseCreated.event';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

export interface IWarehouseProps {
  code: WarehouseCode;
  name: string;
  address?: Address;
  isActive: boolean;
}

export class Warehouse extends AggregateRoot<IWarehouseProps> {
  private constructor(props: IWarehouseProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IWarehouseProps, orgId: string): Warehouse {
    const warehouse = new Warehouse(props, undefined, orgId);
    warehouse.addDomainEvent(new WarehouseCreatedEvent(warehouse));
    return warehouse;
  }

  public static reconstitute(props: IWarehouseProps, id: string, orgId: string): Warehouse {
    return new Warehouse(props, id, orgId);
  }

  public update(props: Partial<IWarehouseProps>): void {
    if (props.code !== undefined) this.props.code = props.code;
    if (props.name !== undefined) this.props.name = props.name;
    if (props.address !== undefined) this.props.address = props.address;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;

    this.updateTimestamp();
  }

  public activate(): void {
    this.props.isActive = true;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.updateTimestamp();
  }

  // Getters
  get code(): WarehouseCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get address(): Address | undefined {
    return this.props.address;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
