import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface IOrganizationProps {
  name: string;
  taxId?: string;
  settings: Record<string, unknown>;
  timezone: string;
  currency: string;
  dateFormat: string;
  isActive: boolean;
}

export class Organization extends AggregateRoot<IOrganizationProps> {
  private constructor(props: IOrganizationProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IOrganizationProps, orgId: string): Organization {
    const organization = new Organization(props, undefined, orgId);
    return organization;
  }

  public static reconstitute(props: IOrganizationProps, id: string, orgId: string): Organization {
    return new Organization(props, id, orgId);
  }

  public update(props: Partial<IOrganizationProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.taxId !== undefined) this.props.taxId = props.taxId;
    if (props.timezone !== undefined) this.props.timezone = props.timezone;
    if (props.currency !== undefined) this.props.currency = props.currency;
    if (props.dateFormat !== undefined) this.props.dateFormat = props.dateFormat;

    this.updateTimestamp();
  }

  public updateSettings(settings: Record<string, unknown>): void {
    this.props.settings = { ...this.props.settings, ...settings };
    this.updateTimestamp();
  }

  public getSetting(key: string): unknown {
    return this.props.settings[key];
  }

  public setSetting(key: string, value: unknown): void {
    this.props.settings[key] = value;
    this.updateTimestamp();
  }

  public removeSetting(key: string): void {
    delete this.props.settings[key];
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
  get name(): string {
    return this.props.name;
  }

  get taxId(): string | undefined {
    return this.props.taxId;
  }

  get settings(): Record<string, unknown> {
    return { ...this.props.settings };
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get currency(): string {
    return this.props.currency;
  }

  get dateFormat(): string {
    return this.props.dateFormat;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }
}
