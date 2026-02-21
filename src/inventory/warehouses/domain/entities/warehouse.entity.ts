import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { WarehouseCreatedEvent } from '@warehouse/domain/events/warehouseCreated.event';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

export interface IWarehouseProps {
  code: WarehouseCode;
  name: string;
  address?: Address;
  isActive: boolean;
  statusChangedBy?: string;
  statusChangedAt?: Date;
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
    const statusChanging = props.isActive !== undefined && props.isActive !== this.props.isActive;
    if (props.code !== undefined) this.props.code = props.code;
    if (props.name !== undefined) this.props.name = props.name;
    if (props.address !== undefined) this.props.address = props.address;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;
    if (statusChanging) {
      this.props.statusChangedBy = props.statusChangedBy ?? this.props.statusChangedBy;
      this.props.statusChangedAt = props.statusChangedAt ?? new Date();
    }
    if (props.statusChangedBy !== undefined && !statusChanging) {
      this.props.statusChangedBy = props.statusChangedBy;
    }

    this.updateTimestamp();
  }

  public activate(changedBy?: string): void {
    this.props.isActive = true;
    this.props.statusChangedBy = changedBy;
    this.props.statusChangedAt = new Date();
    this.updateTimestamp();
  }

  public deactivate(changedBy?: string): void {
    this.props.isActive = false;
    this.props.statusChangedBy = changedBy;
    this.props.statusChangedAt = new Date();
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

  get statusChangedBy(): string | undefined {
    return this.props.statusChangedBy;
  }

  get statusChangedAt(): Date | undefined {
    return this.props.statusChangedAt;
  }
}
