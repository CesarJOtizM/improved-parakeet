import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { LocationAddedEvent } from '@warehouse/domain/events/locationAdded.event';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

export interface ILocationProps {
  code: LocationCode;
  name: string;
  warehouseId: string;
  isDefault: boolean;
  isActive: boolean;
}

export class Location extends AggregateRoot<ILocationProps> {
  private constructor(props: ILocationProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ILocationProps, orgId: string): Location {
    const location = new Location(props, undefined, orgId);
    location.addDomainEvent(new LocationAddedEvent(location));
    return location;
  }

  public static reconstitute(props: ILocationProps, id: string, orgId: string): Location {
    return new Location(props, id, orgId);
  }

  public update(props: Partial<ILocationProps>): void {
    if (props.code !== undefined) this.props.code = props.code;
    if (props.name !== undefined) this.props.name = props.name;
    if (props.isDefault !== undefined) this.props.isDefault = props.isDefault;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;

    this.updateTimestamp();
  }

  public setAsDefault(): void {
    this.props.isDefault = true;
    this.updateTimestamp();
  }

  public removeAsDefault(): void {
    this.props.isDefault = false;
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
  get code(): LocationCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
