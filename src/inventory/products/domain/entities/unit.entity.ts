import { Entity } from '@shared/domain/base/entity.base';

export interface IUnitProps {
  code: string;
  name: string;
  precision: number;
}

export class Unit extends Entity<IUnitProps> {
  private constructor(props: IUnitProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IUnitProps, orgId: string): Unit {
    return new Unit(props, undefined, orgId);
  }

  public static reconstitute(props: IUnitProps, id: string, orgId: string): Unit {
    return new Unit(props, id, orgId);
  }

  public update(props: Partial<IUnitProps>): void {
    if (props.code !== undefined) this.props.code = props.code;
    if (props.name !== undefined) this.props.name = props.name;
    if (props.precision !== undefined) this.props.precision = props.precision;

    this.updateTimestamp();
  }

  // Getters
  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get precision(): number {
    return this.props.precision;
  }
}
