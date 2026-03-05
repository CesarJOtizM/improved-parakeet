import { Entity } from '@shared/domain/base/entity.base';

export interface ICompanyProps {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export class Company extends Entity<ICompanyProps> {
  private constructor(props: ICompanyProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<ICompanyProps, 'isActive'> & { isActive?: boolean },
    orgId: string
  ): Company {
    return new Company({ ...props, isActive: props.isActive ?? true }, undefined, orgId);
  }

  public static reconstitute(props: ICompanyProps, id: string, orgId: string): Company {
    return new Company(props, id, orgId);
  }

  public update(props: Partial<ICompanyProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.code !== undefined) this.props.code = props.code;
    if (props.description !== undefined) this.props.description = props.description;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;

    this.updateTimestamp();
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
