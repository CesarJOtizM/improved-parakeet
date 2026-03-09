import { Entity } from '@shared/domain/base/entity.base';

export interface IContactProps {
  name: string;
  identification: string;
  type: string; // CUSTOMER, SUPPLIER
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

export class Contact extends Entity<IContactProps> {
  private constructor(props: IContactProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IContactProps, 'isActive'> & { isActive?: boolean },
    orgId: string
  ): Contact {
    return new Contact({ ...props, isActive: props.isActive ?? true }, undefined, orgId);
  }

  public static reconstitute(props: IContactProps, id: string, orgId: string): Contact {
    return new Contact(props, id, orgId);
  }

  public update(props: Partial<IContactProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.identification !== undefined) this.props.identification = props.identification;
    if (props.type !== undefined) this.props.type = props.type;
    if (props.email !== undefined) this.props.email = props.email;
    if (props.phone !== undefined) this.props.phone = props.phone;
    if (props.address !== undefined) this.props.address = props.address;
    if (props.notes !== undefined) this.props.notes = props.notes;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;
    this.updateTimestamp();
  }

  get name(): string {
    return this.props.name;
  }
  get identification(): string {
    return this.props.identification;
  }
  get type(): string {
    return this.props.type;
  }
  get email(): string | undefined {
    return this.props.email;
  }
  get phone(): string | undefined {
    return this.props.phone;
  }
  get address(): string | undefined {
    return this.props.address;
  }
  get notes(): string | undefined {
    return this.props.notes;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
}
