import { Entity } from '@shared/domain/base/entity.base';

export interface WarehouseProps {
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
}

export class Warehouse extends Entity<WarehouseProps> {
  private constructor(props: WarehouseProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: WarehouseProps, orgId: string): Warehouse {
    return new Warehouse(props, undefined, orgId);
  }

  public static reconstitute(props: WarehouseProps, id: string, orgId: string): Warehouse {
    return new Warehouse(props, id, orgId);
  }

  public update(props: Partial<WarehouseProps>): void {
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
  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get address(): string | undefined {
    return this.props.address;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
