import { Entity } from '@shared/domain/base/entity.base';

export interface UnitProps {
  code: string;
  name: string;
  precision: number;
}

export class Unit extends Entity<UnitProps> {
  private constructor(props: UnitProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: UnitProps, orgId: string): Unit {
    return new Unit(props, undefined, orgId);
  }

  public static reconstitute(props: UnitProps, id: string, orgId: string): Unit {
    return new Unit(props, id, orgId);
  }

  public update(props: Partial<UnitProps>): void {
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
