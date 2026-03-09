import { Entity } from '@shared/domain/base/entity.base';

export interface IIntegrationConnectionProps {
  provider: string;
  accountName: string;
  storeName: string;
  status: string;
  syncStrategy: string;
  syncDirection: string;
  encryptedAppKey: string;
  encryptedAppToken: string;
  webhookSecret: string;
  defaultWarehouseId: string;
  defaultContactId?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncError?: string;
  companyId?: string;
  createdBy: string;
}

export class IntegrationConnection extends Entity<IIntegrationConnectionProps> {
  private constructor(props: IIntegrationConnectionProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IIntegrationConnectionProps, 'status'> & { status?: string },
    orgId: string
  ): IntegrationConnection {
    return new IntegrationConnection(
      { ...props, status: props.status ?? 'DISCONNECTED' },
      undefined,
      orgId
    );
  }

  public static reconstitute(
    props: IIntegrationConnectionProps,
    id: string,
    orgId: string
  ): IntegrationConnection {
    return new IntegrationConnection(props, id, orgId);
  }

  public connect(): void {
    this.props.status = 'CONNECTED';
    this.props.connectedAt = new Date();
    this.props.lastSyncError = undefined;
    this.updateTimestamp();
  }

  public disconnect(): void {
    this.props.status = 'DISCONNECTED';
    this.updateTimestamp();
  }

  public markError(message: string): void {
    this.props.status = 'ERROR';
    this.props.lastSyncError = message;
    this.updateTimestamp();
  }

  public updateLastSync(): void {
    this.props.lastSyncAt = new Date();
    this.props.lastSyncError = undefined;
    this.updateTimestamp();
  }

  public updateCredentials(encryptedAppKey: string, encryptedAppToken: string): void {
    this.props.encryptedAppKey = encryptedAppKey;
    this.props.encryptedAppToken = encryptedAppToken;
    this.updateTimestamp();
  }

  public update(
    props: Partial<
      Pick<
        IIntegrationConnectionProps,
        | 'storeName'
        | 'syncStrategy'
        | 'syncDirection'
        | 'defaultWarehouseId'
        | 'defaultContactId'
        | 'companyId'
      >
    >
  ): void {
    if (props.storeName !== undefined) this.props.storeName = props.storeName;
    if (props.syncStrategy !== undefined) this.props.syncStrategy = props.syncStrategy;
    if (props.syncDirection !== undefined) this.props.syncDirection = props.syncDirection;
    if (props.defaultWarehouseId !== undefined)
      this.props.defaultWarehouseId = props.defaultWarehouseId;
    if (props.defaultContactId !== undefined) this.props.defaultContactId = props.defaultContactId;
    if (props.companyId !== undefined) this.props.companyId = props.companyId;
    this.updateTimestamp();
  }

  get provider(): string {
    return this.props.provider;
  }
  get accountName(): string {
    return this.props.accountName;
  }
  get storeName(): string {
    return this.props.storeName;
  }
  get status(): string {
    return this.props.status;
  }
  get syncStrategy(): string {
    return this.props.syncStrategy;
  }
  get syncDirection(): string {
    return this.props.syncDirection;
  }
  get encryptedAppKey(): string {
    return this.props.encryptedAppKey;
  }
  get encryptedAppToken(): string {
    return this.props.encryptedAppToken;
  }
  get webhookSecret(): string {
    return this.props.webhookSecret;
  }
  get defaultWarehouseId(): string {
    return this.props.defaultWarehouseId;
  }
  get defaultContactId(): string | undefined {
    return this.props.defaultContactId;
  }
  get connectedAt(): Date | undefined {
    return this.props.connectedAt;
  }
  get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }
  get lastSyncError(): string | undefined {
    return this.props.lastSyncError;
  }
  get companyId(): string | undefined {
    return this.props.companyId;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
}
