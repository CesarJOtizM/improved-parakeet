import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

import { LocationCode } from '../valueObjects/locationCode.valueObject';
import { LocationType } from '../valueObjects/locationType.valueObject';

export interface ILocationProps {
  code: LocationCode;
  name: string;
  description?: string;
  type: LocationType;
  warehouseId: string;
  parentId?: string;
  isActive: boolean;
}

export class Location extends AggregateRoot<ILocationProps> {
  private constructor(props: ILocationProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ILocationProps, orgId: string): Location {
    return new Location(props, undefined, orgId);
  }

  public static reconstitute(props: ILocationProps, id: string, orgId: string): Location {
    return new Location(props, id, orgId);
  }

  public update(props: Partial<Omit<ILocationProps, 'warehouseId'>>): void {
    if (props.code !== undefined) this.props.code = props.code;
    if (props.name !== undefined) this.props.name = props.name;
    if (props.description !== undefined) this.props.description = props.description;
    if (props.type !== undefined) this.props.type = props.type;
    if (props.parentId !== undefined) this.props.parentId = props.parentId;
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

  public setParent(parentId: string | undefined): void {
    this.props.parentId = parentId;
    this.updateTimestamp();
  }

  // Getters
  get code(): LocationCode {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get type(): LocationType {
    return this.props.type;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
